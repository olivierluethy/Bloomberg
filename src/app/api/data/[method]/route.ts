import { NextResponse } from "next/server";
import { routingProvider } from "@/data/routing-provider";
import type { Interval, Range } from "@/data/types";

/**
 * Single dispatch endpoint for the data layer. The client provider hits
 * /api/data/<method>?…; everything real runs here on the server so API keys
 * never reach the browser. Provenance ("live" | "simulated") is carried in the
 * response body by the router.
 */
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ method: string }> },
): Promise<Response> {
  const { method } = await ctx.params;
  const sp = new URL(req.url).searchParams;
  const symbol = sp.get("symbol") ?? "";

  try {
    switch (method) {
      case "quote":
        return NextResponse.json(await routingProvider.getQuote(symbol));
      case "ohlcv":
        return NextResponse.json(
          await routingProvider.getOHLCV(
            symbol,
            (sp.get("range") ?? "1M") as Range,
            (sp.get("interval") ?? "1day") as Interval,
          ),
        );
      case "orderbook":
        return NextResponse.json(
          await routingProvider.getOrderBook(symbol, Number(sp.get("depth") ?? 12)),
        );
      case "news":
        return NextResponse.json(
          await routingProvider.getNews({
            symbol: sp.get("symbol") ?? undefined,
            category: sp.get("category") ?? undefined,
            limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
          }),
        );
      case "fundamentals":
        return NextResponse.json(await routingProvider.getFundamentals(symbol));
      case "estimates":
        return NextResponse.json(await routingProvider.getAnalystEstimates(symbol));
      case "ownership":
        return NextResponse.json(await routingProvider.getOwnership(symbol));
      case "econ":
        return NextResponse.json(
          await routingProvider.getEconomicSeries(sp.get("seriesId") ?? symbol),
        );
      case "earnings":
        return NextResponse.json(
          await routingProvider.getEarningsCalendar({
            from: sp.get("from") ?? "",
            to: sp.get("to") ?? "",
          }),
        );
      case "econcal":
        return NextResponse.json(
          await routingProvider.getEconomicCalendar({
            from: sp.get("from") ?? "",
            to: sp.get("to") ?? "",
          }),
        );
      case "ipo":
        return NextResponse.json(
          await routingProvider.getIpoCalendar({
            from: sp.get("from") ?? "",
            to: sp.get("to") ?? "",
          }),
        );
      case "search":
        return NextResponse.json(await routingProvider.search(sp.get("q") ?? ""));
      default:
        return NextResponse.json({ error: `unknown method: ${method}` }, { status: 404 });
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
