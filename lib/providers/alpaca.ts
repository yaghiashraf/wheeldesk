import { parseOccSymbol } from "@/lib/occ";
import type { Chain, ContractQuote, DailyBar } from "@/lib/types";

const DATA_ROOT = "https://data.alpaca.markets";
const TRADING_ROOT = (process.env.APCA_API_BASE_URL || "https://paper-api.alpaca.markets")
  .replace(/\/+$/, "")
  .replace(/\/v2$/, "");

function getKeyId() {
  return process.env.APCA_API_KEY_ID || "";
}

function getSecret() {
  return process.env.APCA_API_SECRET_KEY || "";
}

export function hasAlpacaCredentials(): boolean {
  return Boolean(getKeyId() && getSecret());
}

async function alpacaFetch<T>(url: string, revalidate: number): Promise<T> {
  const response = await fetch(url, {
    next: { revalidate },
    headers: {
      "APCA-API-KEY-ID": getKeyId(),
      "APCA-API-SECRET-KEY": getSecret(),
    },
  });
  if (!response.ok) {
    throw new Error(`Alpaca request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

type StockSnapshot = {
  latestTrade?: { p?: number };
  latestQuote?: { bp?: number; ap?: number };
  dailyBar?: { c?: number };
};

/** Real-time (IEX feed) spot prices for a batch of symbols. */
export async function getAlpacaSpots(symbols: string[]): Promise<Record<string, number>> {
  const params = new URLSearchParams({ symbols: symbols.join(","), feed: "iex" });
  const payload = await alpacaFetch<Record<string, StockSnapshot>>(
    `${DATA_ROOT}/v2/stocks/snapshots?${params.toString()}`,
    60,
  );

  const spots: Record<string, number> = {};
  for (const [symbol, snapshot] of Object.entries(payload)) {
    const price = snapshot?.latestTrade?.p ?? snapshot?.dailyBar?.c;
    if (typeof price === "number" && price > 0) {
      spots[symbol] = price;
    }
  }
  return spots;
}

type AlpacaBar = { t: string; o: number; h: number; l: number; c: number; v: number };

export async function getAlpacaDailyBars(symbol: string, limit = 400): Promise<DailyBar[]> {
  const start = new Date(Date.now() - limit * 1.6 * 86_400_000).toISOString().slice(0, 10);
  const params = new URLSearchParams({
    symbols: symbol,
    timeframe: "1Day",
    start,
    adjustment: "split",
    feed: "iex",
    sort: "asc",
    limit: "1000",
  });
  const payload = await alpacaFetch<{ bars?: Record<string, AlpacaBar[]> }>(
    `${DATA_ROOT}/v2/stocks/bars?${params.toString()}`,
    3600,
  );
  return (payload.bars?.[symbol] ?? [])
    .filter((bar) => bar.c > 0)
    .slice(-limit)
    .map((bar) => ({
      date: bar.t.slice(0, 10),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
    }));
}

type AlpacaContract = {
  symbol: string;
  expiration_date: string;
  strike_price: string;
  type: "call" | "put";
  open_interest?: string;
};

type AlpacaOptionSnapshot = {
  impliedVolatility?: number;
  greeks?: { delta?: number; gamma?: number; theta?: number; vega?: number };
  latestTrade?: { p?: number };
  latestQuote?: { bp?: number; ap?: number };
};

async function getOptionContracts(args: {
  symbol: string;
  maxDte: number;
  strikeLow: number;
  strikeHigh: number;
}): Promise<AlpacaContract[]> {
  const today = new Date().toISOString().slice(0, 10);
  const lte = new Date(Date.now() + args.maxDte * 86_400_000).toISOString().slice(0, 10);
  const contracts: AlpacaContract[] = [];
  let pageToken = "";

  do {
    const params = new URLSearchParams({
      underlying_symbols: args.symbol,
      status: "active",
      expiration_date_gte: today,
      expiration_date_lte: lte,
      strike_price_gte: args.strikeLow.toFixed(2),
      strike_price_lte: args.strikeHigh.toFixed(2),
      limit: "500",
    });
    if (pageToken) params.set("page_token", pageToken);

    const payload = await alpacaFetch<{
      option_contracts?: AlpacaContract[];
      next_page_token?: string | null;
    }>(`${TRADING_ROOT}/v2/options/contracts?${params.toString()}`, 600);

    contracts.push(...(payload.option_contracts ?? []));
    pageToken = payload.next_page_token ?? "";
  } while (pageToken && contracts.length < 2000);

  return contracts;
}

async function getOptionSnapshots(
  occSymbols: string[],
): Promise<Record<string, AlpacaOptionSnapshot>> {
  const snapshots: Record<string, AlpacaOptionSnapshot> = {};
  for (let index = 0; index < occSymbols.length; index += 100) {
    const chunk = occSymbols.slice(index, index + 100);
    const params = new URLSearchParams({
      symbols: chunk.join(","),
      feed: "indicative",
      limit: String(chunk.length),
    });
    const payload = await alpacaFetch<{ snapshots?: Record<string, AlpacaOptionSnapshot> }>(
      `${DATA_ROOT}/v1beta1/options/snapshots?${params.toString()}`,
      600,
    );
    Object.assign(snapshots, payload.snapshots ?? {});
  }
  return snapshots;
}

/**
 * Full chain for one symbol from Alpaca (contracts + indicative snapshots).
 * Several API calls per symbol, so this is reserved for single-symbol views;
 * universe scans use the one-request Cboe chain instead.
 */
export async function getAlpacaChain(symbol: string, maxDte = 90): Promise<Chain> {
  const upper = symbol.toUpperCase();
  const spots = await getAlpacaSpots([upper]);
  const spot = spots[upper];
  if (!spot) {
    throw new Error(`Alpaca returned no spot price for ${upper}`);
  }

  const contracts = await getOptionContracts({
    symbol: upper,
    maxDte,
    strikeLow: spot * 0.6,
    strikeHigh: spot * 1.4,
  });
  const snapshots = await getOptionSnapshots(contracts.map((contract) => contract.symbol));

  const quotes: ContractQuote[] = [];
  for (const contract of contracts) {
    const parsed = parseOccSymbol(contract.symbol);
    if (!parsed) continue;
    const snapshot = snapshots[contract.symbol];
    const iv = snapshot?.impliedVolatility ?? null;
    quotes.push({
      occSymbol: contract.symbol,
      underlying: upper,
      type: contract.type,
      strike: Number(contract.strike_price),
      expiration: contract.expiration_date,
      bid: snapshot?.latestQuote?.bp ?? null,
      ask: snapshot?.latestQuote?.ap ?? null,
      last: snapshot?.latestTrade?.p ?? null,
      iv: iv && iv > 0 ? iv : null,
      delta: snapshot?.greeks?.delta ?? null,
      gamma: snapshot?.greeks?.gamma ?? null,
      theta: snapshot?.greeks?.theta ?? null,
      vega: snapshot?.greeks?.vega ?? null,
      openInterest: contract.open_interest ? Number(contract.open_interest) : null,
      volume: null,
    });
  }

  return {
    symbol: upper,
    spot,
    asOf: new Date().toISOString(),
    source: "alpaca",
    iv30: null,
    contracts: quotes,
  };
}
