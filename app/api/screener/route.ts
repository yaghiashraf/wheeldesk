import { NextRequest, NextResponse } from "next/server";
import { getScanChains } from "@/lib/chain";
import { filtersFromParams } from "@/lib/filters";
import { getVixRegime } from "@/lib/providers/cboe";
import { getAlpacaDailyBars, hasAlpacaCredentials } from "@/lib/providers/alpaca";
import { getDividendCalendar, getEarningsCalendar, hasFmpKey } from "@/lib/providers/fmp";
import { UNIVERSE_SYMBOLS } from "@/lib/universe";
import { buildRows, realizedVol30FromCloses } from "@/lib/wheel";
import type { RegimeInfo, ScreenerBatchResponse, ScreenerRow, Strategy } from "@/lib/types";

export const maxDuration = 60;

const BATCH_SIZE = 12;

/**
 * Realized vol during scans comes from Alpaca only (its own rate budget,
 * cached 1h). Pulling per-symbol history from Cboe here would double the
 * request volume against its burst limit; keyless scans show IV/RV as "—"
 * and the score uses its neutral value. The single-symbol ticker page still
 * computes RV keylessly.
 */
async function realizedVolFor(symbol: string): Promise<number | null> {
  if (!hasAlpacaCredentials()) return null;
  try {
    const bars = await getAlpacaDailyBars(symbol, 60);
    return realizedVol30FromCloses(bars.map((bar) => bar.close));
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const strategy: Strategy = params.get("strategy") === "cc" ? "cc" : "csp";
  const cursor = Math.max(0, Number(params.get("cursor")) || 0);

  const symbols = UNIVERSE_SYMBOLS.slice(cursor, cursor + BATCH_SIZE);
  if (symbols.length === 0) {
    return NextResponse.json(
      { error: "cursor is past the end of the universe" },
      { status: 400 },
    );
  }

  let regime: RegimeInfo | null = null;
  try {
    regime = await getVixRegime();
  } catch {
    // Screener still works without the regime overlay.
  }

  const filters = filtersFromParams(params, strategy, regime?.regime ?? "normal");

  const [{ chains, failed }, earnings, dividends] = await Promise.all([
    getScanChains(symbols),
    hasFmpKey() ? getEarningsCalendar() : Promise.resolve<Record<string, string>>({}),
    hasFmpKey() ? getDividendCalendar() : Promise.resolve<Record<string, string>>({}),
  ]);

  const rvBySymbol = new Map(
    await Promise.all(
      chains.map(
        async (chain) => [chain.symbol, await realizedVolFor(chain.symbol)] as const,
      ),
    ),
  );

  const rows: ScreenerRow[] = chains.flatMap((chain) =>
    buildRows({
      chain,
      strategy,
      filters,
      realizedVol30: rvBySymbol.get(chain.symbol) ?? null,
      earningsDate: earnings[chain.symbol] ?? null,
      exDivDate: dividends[chain.symbol] ?? null,
    }),
  );

  const nextCursor = cursor + BATCH_SIZE < UNIVERSE_SYMBOLS.length ? cursor + BATCH_SIZE : null;

  const body: ScreenerBatchResponse = {
    rows,
    scanned: symbols,
    failed,
    nextCursor,
    universeSize: UNIVERSE_SYMBOLS.length,
    regime,
    asOf: new Date().toISOString(),
  };
  return NextResponse.json(body);
}
