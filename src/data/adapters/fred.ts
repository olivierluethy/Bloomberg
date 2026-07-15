import "server-only";
import { sourced } from "@/data/provider";
import { serverEnv } from "@/data/env";
import type { EconPoint, Sourced } from "@/data/types";

/**
 * FRED adapter — macroeconomic series (CPI, unemployment, GDP, Fed funds,
 * treasury yields) from the St. Louis Fed. Free key, generous limits. Powers the
 * Phase 9 economic dashboard; the `seriesId` is a FRED code, e.g. "CPIAUCSL".
 */
const PROVIDER = "FRED";
const BASE = "https://api.stlouisfed.org/fred";

export const fredAdapter = {
  async getEconomicSeries(seriesId: string): Promise<Sourced<EconPoint[]>> {
    const q = new URLSearchParams({
      series_id: seriesId,
      api_key: serverEnv.fred,
      file_type: "json",
      sort_order: "asc",
      limit: "120",
    });
    const res = await fetch(`${BASE}/series/observations?${q.toString()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`FRED ${res.status}`);
    const body = (await res.json()) as { observations?: Array<{ date: string; value: string }> };
    const points: EconPoint[] = (body.observations ?? [])
      .filter((o) => o.value !== ".")
      .map((o) => ({ date: o.date, value: Number(o.value) }));
    if (points.length === 0) throw new Error("FRED: empty series");
    return sourced(points, "live", PROVIDER);
  },
};
