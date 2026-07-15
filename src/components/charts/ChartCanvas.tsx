"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type CandlestickData,
  type IChartApi,
  type LineData,
  type LogicalRange,
  type MouseEventParams,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/data/types";
import { bollinger, ema, macd, rsi, sma, type Series } from "@/lib/indicators";
import type { CrosshairInfo, IndicatorConfig } from "@/components/charts/types";

/**
 * Low-level lightweight-charts (v5) renderer: candlesticks + volume, with
 * toggleable indicator overlays (SMA/EMA/Bollinger on the price pane) and
 * separate panes for RSI and MACD. Imperative by nature — it rebuilds on data
 * or indicator change and preserves zoom across indicator toggles.
 *
 * Not used directly by features — always via <PriceChart/>.
 */

const COLORS = {
  up: "#26d07c",
  down: "#ff4d5e",
  sma: "#ff9e1b",
  ema: "#38bdf8",
  band: "#55585f",
  rsi: "#c084fc",
  macd: "#38bdf8",
  signal: "#ff9e1b",
  grid: "rgba(36,38,43,0.55)",
  text: "#8a8d93",
  axis: "#24262b",
};

function sanitize(candles: Candle[]): Candle[] {
  const seen = new Set<number>();
  return candles
    .filter((c) => Number.isFinite(c.time) && !seen.has(c.time) && seen.add(c.time))
    .sort((a, b) => a.time - b.time);
}

/** Align an indicator Series to candle times, dropping warmup nulls. */
function toLine(series: Series, candles: Candle[]): LineData<Time>[] {
  const out: LineData<Time>[] = [];
  for (let i = 0; i < candles.length; i++) {
    const v = series[i];
    if (v != null) out.push({ time: candles[i]!.time as UTCTimestamp, value: v });
  }
  return out;
}

export default function ChartCanvas({
  candles,
  config,
  onCrosshair,
}: {
  candles: Candle[];
  config: IndicatorConfig;
  onCrosshair?: (info: CrosshairInfo | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<LogicalRange | null>(null);
  const prevCandlesRef = useRef<Candle[] | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const data = sanitize(candles);
    const chart: IChartApi = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: COLORS.text,
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 10,
        panes: { separatorColor: COLORS.axis, separatorHoverColor: "#34373d" },
        attributionLogo: false,
      },
      grid: { vertLines: { color: COLORS.grid }, horzLines: { color: COLORS.grid } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#55585f", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#ff9e1b" },
        horzLine: { color: "#55585f", width: 1, style: LineStyle.Dashed, labelBackgroundColor: "#ff9e1b" },
      },
      rightPriceScale: { borderColor: COLORS.axis },
      timeScale: { borderColor: COLORS.axis, timeVisible: true, secondsVisible: false },
    });

    const closes = data.map((c) => c.close);

    // Price pane (0): candles + volume overlay.
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: COLORS.up,
      downColor: COLORS.down,
      wickUpColor: COLORS.up,
      wickDownColor: COLORS.down,
      borderVisible: false,
      priceLineVisible: false,
    });
    candleSeries.setData(
      data.map<CandlestickData<Time>>((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );

    if (data.some((c) => c.volume > 0)) {
      const volume = chart.addSeries(HistogramSeries, {
        priceScaleId: "vol",
        priceFormat: { type: "volume" },
        lastValueVisible: false,
        priceLineVisible: false,
      });
      volume.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      volume.setData(
        data.map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? "rgba(38,208,124,0.35)" : "rgba(255,77,94,0.35)",
        })),
      );
    }

    const addOverlay = (series: Series, color: string, style: LineStyle = LineStyle.Solid) => {
      const points = toLine(series, data);
      if (points.length === 0) return; // not enough data for this indicator's window
      const line = chart.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        lineStyle: style,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      line.setData(points);
    };

    if (config.sma) addOverlay(sma(closes, 20), COLORS.sma);
    if (config.ema) addOverlay(ema(closes, 20), COLORS.ema);
    if (config.bollinger) {
      const bb = bollinger(closes, 20, 2);
      addOverlay(bb.upper, COLORS.band, LineStyle.Dotted);
      addOverlay(bb.middle, COLORS.band, LineStyle.Dashed);
      addOverlay(bb.lower, COLORS.band, LineStyle.Dotted);
    }

    // Extra panes for oscillators — only added when the series can actually be
    // computed for this data window (short/coarse ranges may not have enough
    // bars, e.g. CoinGecko's low-granularity long-range crypto candles).
    let paneIndex = 1;
    const rsiData = config.rsi ? toLine(rsi(closes, 14), data) : [];
    if (rsiData.length > 0) {
      const rsiPane = paneIndex++;
      const rsiSeries = chart.addSeries(LineSeries, { color: COLORS.rsi, lineWidth: 1, priceLineVisible: false }, rsiPane);
      rsiSeries.setData(rsiData);
      rsiSeries.createPriceLine({ price: 70, color: "#3a3d44", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "70" });
      rsiSeries.createPriceLine({ price: 30, color: "#3a3d44", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: "30" });
    }
    const macdParts = config.macd ? macd(closes) : null;
    if (macdParts && toLine(macdParts.macd, data).length > 0) {
      const macdPane = paneIndex++;
      const m = macdParts;
      const histSeries = chart.addSeries(
        HistogramSeries,
        { priceLineVisible: false, lastValueVisible: false },
        macdPane,
      );
      histSeries.setData(
        data.flatMap((c, i) =>
          m.hist[i] != null
            ? [{ time: c.time as UTCTimestamp, value: m.hist[i] as number, color: (m.hist[i] as number) >= 0 ? "rgba(38,208,124,0.5)" : "rgba(255,77,94,0.5)" }]
            : [],
        ),
      );
      const macdSeries = chart.addSeries(LineSeries, { color: COLORS.macd, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, macdPane);
      macdSeries.setData(toLine(m.macd, data));
      const signalSeries = chart.addSeries(LineSeries, { color: COLORS.signal, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, macdPane);
      signalSeries.setData(toLine(m.signal, data));
    }

    // Give the price pane the lion's share of the height.
    const panes = chart.panes();
    if (panes.length > 1) {
      panes[0]?.setStretchFactor(3);
      for (let i = 1; i < panes.length; i++) panes[i]?.setStretchFactor(1);
    }

    // Preserve zoom across indicator toggles; fit fresh when the data changes.
    if (prevCandlesRef.current === candles && rangeRef.current) {
      chart.timeScale().setVisibleLogicalRange(rangeRef.current);
    } else {
      chart.timeScale().fitContent();
    }
    prevCandlesRef.current = candles;
    chart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
      if (r) rangeRef.current = r;
    });

    if (onCrosshair) {
      chart.subscribeCrosshairMove((param: MouseEventParams<Time>) => {
        const bar = param.time ? (param.seriesData.get(candleSeries) as CandlestickData<Time> | undefined) : undefined;
        if (!bar) {
          onCrosshair(null);
          return;
        }
        onCrosshair({
          time: param.time as number,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        });
      });
    }

    return () => chart.remove();
  }, [candles, config, onCrosshair]);

  return <div ref={containerRef} className="h-full w-full" />;
}
