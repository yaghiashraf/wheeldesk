import { NextRequest, NextResponse } from "next/server";
import { getScanChains } from "@/lib/chain";
import { filtersFromParams } from "@/lib/filters";
import { getAlpacaDailyBars, hasAlpacaCredentials } from "@/lib/providers/alpaca";
import {
  getAlphaVantageEarningsCalendar,
  hasAlphaVantageKey,
} from "@/lib/providers/alphavantage";
import {
  getDividendCalendar,
  getEarningsCalendar,
  getFmpDailyCloses,
  hasFmpKey,
} from "@/lib/providers/fmp";
import { getNasdaqFundamentals } from "@/lib/providers/nasdaq";
import { getYahooDailyCloses } from "@/lib/providers/yahoo";
import {
  getPeerGroup,
  getSymbolMeta,
  UNIVERSE,
  UNIVERSE_SYMBOLS,
} from "@/lib/universe";
import { buildRows, realizedVol30FromCloses } from "@/lib/wheel";
import type {
  RealizedVolSource,
  ScreenerBatchResponse,
  ScreenerRow,
  Strategy,
} from "@/lib/types";

export const maxDuration = 60;

// The client streams these batches sequentially, so batch width sets the round
// trip count for a full scan. Four keeps the Cboe retry/backoff envelope inside
// Vercel's 60-second function limit; running locally has no such ceiling, so
// SCAN_BATCH_SIZE widens it there and cuts a 90-name scan to a handful of hops.
const BATCH_SIZE = Math.min(
  32,
  Math.max(1, Number(process.env.SCAN_BATCH_SIZE) || 4),
);
const BATCH_DEADLINE_MS = 45000;

async function withinDeadline<T>(task: Promise<T>): Promise<T | null> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), BATCH_DEADLINE_MS);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

/**
 * Scan RV30 uses Alpaca when configured, then FMP, then adjusted Yahoo chart
 * history. All are cached for one hour and avoid doubling traffic against the
 * rate-limited Cboe service supplying chains. RV30 annualizes 30 log returns.
 */
async function realizedVolFor(
  symbol: string,
): Promise<{ value: number | null; source: RealizedVolSource | null }> {
  if (hasAlpacaCredentials()) {
    try {
      const bars = await getAlpacaDailyBars(symbol, 60);
      const value = realizedVol30FromCloses(bars.map((bar) => bar.close));
      if (value !== null) return { value, source: "alpaca" };
    } catch {
      // Continue to the independent FMP history fallback.
    }
  }
  if (hasFmpKey()) {
    const value = realizedVol30FromCloses(await getFmpDailyCloses(symbol, 60));
    if (value !== null) return { value, source: "fmp" };
  }
  const yahooValue = realizedVol30FromCloses(await getYahooDailyCloses(symbol, 60));
  if (yahooValue !== null) return { value: yahooValue, source: "yahoo" };
  return { value: null, source: null };
}

/** Any configured event calendar makes the earnings column meaningful. */
function hasEventCalendar(): boolean {
  return hasFmpKey() || hasAlphaVantageKey();
}

/**
 * Union of the forward earnings calendars. FMP and Alpha Vantage cover
 * different slices of the same market — neither carries the full watchlist —
 * so merging them shrinks the set of names whose next report is unknowable.
 * When both name a date, the earlier one wins: an earlier report is the one
 * that lands inside a trade window, so it is the conservative choice.
 */
async function earningsCalendar(): Promise<Record<string, string>> {
  const [fmp, av] = await Promise.all([
    hasFmpKey() ? getEarningsCalendar() : Promise.resolve<Record<string, string>>({}),
    getAlphaVantageEarningsCalendar(),
  ]);
  const merged: Record<string, string> = { ...fmp };
  for (const [symbol, date] of Object.entries(av)) {
    if (!merged[symbol] || date < merged[symbol]) merged[symbol] = date;
  }
  return merged;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const strategy: Strategy = params.get("strategy") === "cc" ? "cc" : "csp";
  const cursor = Math.max(0, Number(params.get("cursor")) || 0);
  const requestedSymbols = params
    .get("symbols")
    ?.split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter((symbol, index, values) => values.indexOf(symbol) === index)
    .flatMap((symbol) => (getSymbolMeta(symbol) ? [symbol] : []))
    .slice(0, BATCH_SIZE);

  if (params.has("symbols") && requestedSymbols?.length === 0) {
    return NextResponse.json(
      { error: "No requested symbols belong to the scanner universe" },
      { status: 400 },
    );
  }

  const symbols =
    requestedSymbols && requestedSymbols.length > 0
      ? requestedSymbols
      : UNIVERSE_SYMBOLS.slice(cursor, cursor + BATCH_SIZE);
  const metas = requestedSymbols?.length
    ? symbols.flatMap((symbol) => {
        const meta = getSymbolMeta(symbol);
        return meta ? [meta] : [];
      })
    : UNIVERSE.slice(cursor, cursor + BATCH_SIZE);
  if (symbols.length === 0) {
    return NextResponse.json(
      { error: "cursor is past the end of the universe" },
      { status: 400 },
    );
  }

  const filters = filtersFromParams(params, strategy);
  const nextCursor =
    requestedSymbols?.length || cursor + BATCH_SIZE >= UNIVERSE_SYMBOLS.length
      ? null
      : cursor + BATCH_SIZE;

  const batch = await withinDeadline(
    Promise.all([
      getScanChains(symbols),
      earningsCalendar(),
      hasFmpKey() ? getDividendCalendar() : Promise.resolve<Record<string, string>>({}),
      getNasdaqFundamentals(metas),
      Promise.all(
        symbols.map(async (symbol) => [symbol, await realizedVolFor(symbol)] as const),
      ),
    ]),
  );

  if (batch === null) {
    const timedOut: ScreenerBatchResponse = {
      rows: [],
      fundamentalUniverse: [],
      scanned: symbols,
      failed: symbols,
      nextCursor,
      universeSize: UNIVERSE_SYMBOLS.length,
      regime: null,
      asOf: new Date().toISOString(),
    };
    return NextResponse.json(timedOut);
  }

  const [{ chains, failed }, earnings, dividends, fundamentals, rvEntries] = batch;

  const rvBySymbol = new Map(rvEntries);

  const rows: ScreenerRow[] = chains.flatMap((chain) =>
    buildRows({
      chain,
      strategy,
      filters,
      realizedVol30: rvBySymbol.get(chain.symbol)?.value ?? null,
      realizedVol30Source: rvBySymbol.get(chain.symbol)?.source ?? null,
      earningsDate: earnings[chain.symbol] ?? null,
      exDivDate: dividends[chain.symbol] ?? null,
      eventDataAvailable: hasEventCalendar(),
      fundamentals: fundamentals[chain.symbol],
    }),
  );

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
    // Regime is loaded once through /api/regime; repeating it in every batch
    // needlessly consumes the same Cboe request budget as option chains.
    regime: null,
    asOf: new Date().toISOString(),
  };
  return NextResponse.json(body);
}
