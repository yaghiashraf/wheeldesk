import { NextRequest, NextResponse } from "next/server";
import { getScanChains } from "@/lib/chain";
import { filtersFromParams } from "@/lib/filters";
import { getVixRegime } from "@/lib/providers/cboe";
import { getAlpacaDailyBars, hasAlpacaCredentials } from "@/lib/providers/alpaca";
import { getDividendCalendar, getEarningsCalendar, hasFmpKey } from "@/lib/providers/fmp";
import { getNasdaqFundamentals } from "@/lib/providers/nasdaq";
import { getPeerGroup, UNIVERSE, UNIVERSE_SYMBOLS } from "@/lib/universe";
import { buildRows, realizedVol30FromCloses } from "@/lib/wheel";
import type { RegimeInfo, ScreenerBatchResponse, ScreenerRow, Strategy } from "@/lib/types";

export const maxDuration = 60;

const BATCH_SIZE = 12;

/**
 * Realized vol during scans comes from Alpaca only (its own rate budget,
 * cached 1h). Pulling per-symbol history from Cboe here would double the
 * request volume against its burst limit; keyless scans show IV/RV as "—"
 * and the underwriter falls back to the lower-confidence contract-IV/IV30
 * basis. The single-symbol ticker page still computes RV keylessly.
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
  const metas = UNIVERSE.slice(cursor, cursor + BATCH_SIZE);
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

  const filters = filtersFromParams(params, strategy);

  const [{ chains, failed }, earnings, dividends, fundamentals] = await Promise.all([
    getScanChains(symbols),
    hasFmpKey() ? getEarningsCalendar() : Promise.resolve<Record<string, string>>({}),
    hasFmpKey() ? getDividendCalendar() : Promise.resolve<Record<string, string>>({}),
    getNasdaqFundamentals(metas),
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
      eventDataAvailable: hasFmpKey(),
      fundamentals: fundamentals[chain.symbol],
    }),
  );

  const nextCursor = cursor + BATCH_SIZE < UNIVERSE_SYMBOLS.length ? cursor + BATCH_SIZE : null;

  const body: ScreenerBatchResponse = {
    rows,
    fundamentalUniverse: metas.map((meta) => ({
      symbol: meta.symbol,
      name: meta.name,
      sector: meta.sector,
      peerGroup: getPeerGroup(meta),
      kind: meta.kind,
      fundamentals: fundamentals[meta.symbol],
    })),
    scanned: symbols,
    failed,
    nextCursor,
    universeSize: UNIVERSE_SYMBOLS.length,
    regime,
    asOf: new Date().toISOString(),
  };
  return NextResponse.json(body);
}
