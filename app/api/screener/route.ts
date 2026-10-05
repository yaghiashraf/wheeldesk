import { NextRequest, NextResponse } from "next/server";
import { getScanChains, withSpot } from "@/lib/chain";
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
import { getVixRegime } from "@/lib/providers/cboe";
import { getNasdaqEvents, getNasdaqFundamentals } from "@/lib/providers/nasdaq";
import { getYahooDailyCloses } from "@/lib/providers/yahoo";
import { getPeerGroup, getSymbolMeta, scanUniverse } from "@/lib/universe";
import { buildRows } from "@/lib/wheel";
import type {
  RealizedVolSource,
  RegimeInfo,
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
 * Daily price context uses Alpaca when configured, then FMP, then adjusted
 * Yahoo chart history. A single one-year request supplies RV30, drawdown, and
 * 1m/3m price context without doubling traffic against the Cboe chain service.
 */
async function dailyHistoryFor(
  symbol: string,
): Promise<{ closes: number[]; source: RealizedVolSource | null }> {
  let best: { closes: number[]; source: RealizedVolSource | null } = {
    closes: [],
    source: null,
  };

  const keepBest = (closes: number[], source: RealizedVolSource) => {
    if (closes.length > best.closes.length) best = { closes, source };
    return closes.length >= 200;
  };

  if (hasAlpacaCredentials()) {
    try {
      const bars = await getAlpacaDailyBars(symbol, 260);
      const closes = bars.map((bar) => bar.close);
      if (keepBest(closes, "alpaca")) return best;
    } catch {
      // Continue to the independent FMP history fallback.
    }
  }
  if (hasFmpKey()) {
    const closes = await getFmpDailyCloses(symbol, 260);
    if (keepBest(closes, "fmp")) return best;
  }
  const yahooCloses = await getYahooDailyCloses(symbol, 260);
  keepBest(yahooCloses, "yahoo");
  return best;
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
type CalendarEntry = { date: string; source: "fmp" | "alphavantage" };

async function earningsCalendar(): Promise<Record<string, CalendarEntry>> {
  const [fmp, av] = await Promise.all([
    hasFmpKey() ? getEarningsCalendar() : Promise.resolve<Record<string, string>>({}),
    getAlphaVantageEarningsCalendar(),
  ]);
  const merged: Record<string, CalendarEntry> = {};
  for (const [symbol, date] of Object.entries(fmp)) merged[symbol] = { date, source: "fmp" };
  for (const [symbol, date] of Object.entries(av)) {
    if (!merged[symbol] || date < merged[symbol].date) merged[symbol] = { date, source: "alphavantage" };
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

  const filters = filtersFromParams(params, strategy);
  const universe = scanUniverse(filters.scope);
  const metas = requestedSymbols?.length
    ? requestedSymbols.flatMap((symbol) => {
        const meta = getSymbolMeta(symbol);
        return meta ? [meta] : [];
      })
    : universe.slice(cursor, cursor + BATCH_SIZE);
  const symbols = metas.map((meta) => meta.symbol);
  if (symbols.length === 0) {
    return NextResponse.json(
      { error: "cursor is past the end of the universe" },
      { status: 400 },
    );
  }

  const nextCursor =
    requestedSymbols?.length || cursor + BATCH_SIZE >= universe.length
      ? null
      : cursor + BATCH_SIZE;

  const batch = await withinDeadline(
    Promise.all([
      getScanChains(symbols),
      earningsCalendar(),
      hasFmpKey() ? getDividendCalendar() : Promise.resolve<Record<string, string>>({}),
      getNasdaqFundamentals(metas),
      Promise.all(
        symbols.map(async (symbol) => [symbol, await dailyHistoryFor(symbol)] as const),
      ),
      getNasdaqEvents(metas, {}),
      // The doctrine band and ROI tier follow the live VIX; the five-minute
      // Cboe cache keeps this to one request per scan, not one per batch.
      filters.doctrine
        ? getVixRegime().catch((): RegimeInfo | null => null)
        : Promise.resolve<RegimeInfo | null>(null),
    ]),
  );

  if (batch === null) {
    const timedOut: ScreenerBatchResponse = {
      rows: [],
      fundamentalUniverse: [],
      scanned: symbols,
      failed: symbols,
      nextCursor,
      universeSize: universe.length,
      regime: null,
      asOf: new Date().toISOString(),
    };
    return NextResponse.json(timedOut);
  }

  const [{ chains: rawChains, failed }, earnings, dividends, fundamentals, historyEntries, events, regime] =
    batch;

  const historyBySymbol = new Map(historyEntries);
  // Nasdaq's quote is real-time; Cboe's chain spot is 15 minutes old. Re-spot
  // the chain so ROI, breakeven and the day change all sit on one price.
  const chains = rawChains.map((chain) => {
    const live = events[chain.symbol]?.quote?.last;
    return live && live > 0 ? withSpot(chain, live) : chain;
  });

  const rows: ScreenerRow[] = chains.flatMap((chain) => {
    const symbolEvents = events[chain.symbol] ?? null;
    // Earliest known date wins across feeds: the conservative choice for a
    // window test. Nasdaq also says whether its date is company-confirmed.
    const calendar = earnings[chain.symbol] ?? null;
    const nasdaqDate = symbolEvents?.earningsDate ?? null;
    const useNasdaq = nasdaqDate !== null && (calendar === null || nasdaqDate <= calendar.date);
    const earningsDate = useNasdaq ? nasdaqDate : (calendar?.date ?? null);
    const earningsSource: ScreenerRow["earningsSource"] =
      earningsDate === null ? null : useNasdaq ? "nasdaq" : calendar!.source;
    return buildRows({
      chain,
      strategy,
      filters,
      dailyCloses: historyBySymbol.get(chain.symbol)?.closes ?? [],
      priceHistorySource: historyBySymbol.get(chain.symbol)?.source ?? null,
      earningsDate,
      earningsSource,
      earningsDateConfirmed: earningsSource === "nasdaq" ? (symbolEvents?.earningsDateConfirmed ?? false) : false,
      exDivDate: dividends[chain.symbol] ?? null,
      eventDataAvailable: hasEventCalendar() || nasdaqDate !== null,
      fundamentals: fundamentals[chain.symbol],
      vix: regime?.vix ?? null,
      events: symbolEvents,
    });
  });

  const body: ScreenerBatchResponse = {
    rows,
    fundamentalUniverse: metas.map((meta) => ({
      symbol: meta.symbol,
      name: meta.name,
      sector: meta.sector,
      peerGroup: getPeerGroup(meta),
      kind: meta.kind,
      watchlistTier: meta.tier,
      fundamentals: fundamentals[meta.symbol],
    })),
    scanned: symbols,
    failed,
    nextCursor,
    universeSize: universe.length,
    // Outside doctrine mode the regime is loaded once through /api/regime;
    // in doctrine mode the batch already holds the cached value it screened on.
    regime: regime ?? null,
    asOf: new Date().toISOString(),
  };
  return NextResponse.json(body);
}
