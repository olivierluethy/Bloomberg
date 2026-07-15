/** Which indicator overlays/panes are active on a PriceChart. */
export interface IndicatorConfig {
  sma: boolean;
  ema: boolean;
  bollinger: boolean;
  rsi: boolean;
  macd: boolean;
}

export const DEFAULT_INDICATORS: IndicatorConfig = {
  sma: false,
  ema: false,
  bollinger: false,
  rsi: false,
  macd: false,
};

/** Values surfaced to the chart legend as the crosshair moves. */
export interface CrosshairInfo {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}
