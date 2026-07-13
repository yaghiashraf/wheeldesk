import { parseOccSymbol } from "@/lib/occ";
import { getYahooLatestPrice } from "@/lib/providers/yahoo";
import type { Chain, ContractQuote, DailyBar, RegimeInfo, VixRegime } from "@/lib/types";

const CBOE_ROOT = "https://cdn.cboe.com/api/global/delayed_quotes";

const CHAIN_REVALIDATE_SECONDS = 900;
const HISTORY_REVALIDATE_SECONDS = 3600;
const VIX_REVALIDATE_SECONDS = 300;

type CboeOptionRecord = {
  option: string;
  bid: number | null;
  ask: number | null;
  iv: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  open_interest: number | null;
  volume: number | null;
  last_trade_price: number | null;
};

type CboeChainPayload = {
  timestamp: string;
  data: {
    symbol: string;
    current_price: number | null;
    close: number | null;
    iv30: number | null;
    options: CboeOptionRecord[];
  };
};

type CboeHistoryPayload = {
  data: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
};

/** Cboe timestamps are US Eastern, e.g. "2026-07-10 14:15:09". */
function cboeTimestampToIso(timestamp: string): string {
  const parsed = new Date(`${timestamp.replace(" ", "T")}-04:00`);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

/**
 * Cboe's CDN rate-limits per IP at roughly ~100 requests/minute and answers
 * bursts with 429s that linger for minutes. Every request is therefore paced
 * through a global queue that spaces request starts, and 429s back off hard.
 * Combined with the 15-minute chain cache, a cold universe scan stays under
 * the budget and warm scans barely touch the network.
 */
const MIN_INTERVAL_MS = Number(process.env.CBOE_MIN_INTERVAL_MS) || 900;
let nextSlot = 0;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function pace(): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, nextSlot);
  nextSlot = slot + MIN_INTERVAL_MS;
  await sleep(slot - now);
}

async function cboeFetch<T>(
  path: string,
  revalidate: number,
  cacheMode: "next" | "instance" = "next",
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    await pace();
    const response = await fetch(`${CBOE_ROOT}${path}`, {
      ...(cacheMode === "next" ? { next: { revalidate } } : { cache: "no-store" as const }),
      headers: { Accept: "application/json" },
    });
    if (response.ok) {
      return (await response.json()) as T;
    }
    const transient =
      response.status === 429 ||
      response.status === 502 ||
      response.status === 503 ||
      response.status === 504;
    if (transient && attempt < 2) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const fallbackDelay =
        response.status === 429 ? 8000 * (attempt + 1) : 1500 * (attempt + 1);
      await sleep(
        Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 30000)
          : fallbackDelay,
      );
      continue;
    }
    throw new Error(`Cboe request for ${path} failed with status ${response.status}`);
  }
}

function toNumberOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Instance-local cache of parsed chains. Next's data cache skips payloads
 * over ~2MB (SPY, QQQ), so warm lambdas keep their own copy for the TTL.
 */
const MAX_CHAIN_CACHE_ENTRIES = 48;
const chainCache = new Map<string, { chain: Chain; expires: number }>();

function cacheChain(symbol: string, chain: Chain): void {
  chainCache.delete(symbol);
  chainCache.set(symbol, {
    chain,
    expires: Date.now() + CHAIN_REVALIDATE_SECONDS * 1000,
  });
  while (chainCache.size > MAX_CHAIN_CACHE_ENTRIES) {
    const oldest = chainCache.keys().next().value as string | undefined;
    if (!oldest) break;
    chainCache.delete(oldest);
  }
}

export async function getCboeChain(symbol: string): Promise<Chain> {
  const upper = symbol.toUpperCase();
  const cached = chainCache.get(upper);
  if (cached && cached.expires > Date.now()) {
    // Refresh recency so actively scanned or opened symbols survive LRU eviction.
    chainCache.delete(upper);
    chainCache.set(upper, cached);
    return cached.chain;
  }
  if (cached) chainCache.delete(upper);

  const payload = await cboeFetch<CboeChainPayload>(
    `/options/${encodeURIComponent(upper)}.json`,
    CHAIN_REVALIDATE_SECONDS,
    "instance",
  );

  const spot = toNumberOrNull(payload.data.current_price) ?? toNumberOrNull(payload.data.close);
  if (spot === null || spot <= 0) {
    throw new Error(`Cboe returned no usable spot price for ${symbol}`);
  }

  const contracts: ContractQuote[] = [];
  for (const record of payload.data.options) {
    const parsed = parseOccSymbol(record.option);
    if (!parsed) continue;
    // Cboe reports zeroed greeks/IV on dead contracts; treat 0 IV as missing.
    const iv = toNumberOrNull(record.iv);
    contracts.push({
      occSymbol: record.option,
      underlying: parsed.underlying,
      type: parsed.type,
      strike: parsed.strike,
      expiration: parsed.expiration,
      bid: toNumberOrNull(record.bid),
      ask: toNumberOrNull(record.ask),
      last: toNumberOrNull(record.last_trade_price),
      iv: iv && iv > 0 ? iv : null,
      delta: toNumberOrNull(record.delta),
      gamma: toNumberOrNull(record.gamma),
      theta: toNumberOrNull(record.theta),
      vega: toNumberOrNull(record.vega),
      openInterest: toNumberOrNull(record.open_interest),
      volume: toNumberOrNull(record.volume),
    });
  }

  const iv30 = toNumberOrNull(payload.data.iv30);
  const chain: Chain = {
    symbol: upper,
    spot,
    asOf: cboeTimestampToIso(payload.timestamp),
    source: "cboe",
    iv30: iv30 && iv30 > 0 ? iv30 / 100 : null,
    contracts,
  };
  cacheChain(upper, chain);
  return chain;
}

export async function getCboeDailyBars(symbol: string, limit = 400): Promise<DailyBar[]> {
  const payload = await cboeFetch<CboeHistoryPayload>(
    `/charts/historical/${encodeURIComponent(symbol.toUpperCase())}.json`,
    HISTORY_REVALIDATE_SECONDS,
  );
  return payload.data
    .filter((bar) => bar.close > 0)
    .slice(-limit)
    .map((bar) => ({
      date: bar.date,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    }));
}

export function classifyVix(vix: number): VixRegime {
  if (vix < 14) return "calm";
  if (vix < 20) return "normal";
  if (vix < 28) return "elevated";
  return "stressed";
}

export async function getVixRegime(): Promise<RegimeInfo> {
  try {
    const payload = await cboeFetch<CboeChainPayload>(
      `/options/_VIX.json`,
      VIX_REVALIDATE_SECONDS,
    );
    const vix = toNumberOrNull(payload.data.current_price) ?? toNumberOrNull(payload.data.close);
    if (vix !== null && vix > 0) {
      return {
        vix,
        regime: classifyVix(vix),
        asOf: cboeTimestampToIso(payload.timestamp),
      };
    }
  } catch {
    // Fall through to the independent index quote below.
  }

  const fallback = await getYahooLatestPrice("^VIX");
  if (!fallback) throw new Error("No provider returned a usable VIX value");
  return {
    vix: fallback.price,
    regime: classifyVix(fallback.price),
    asOf: fallback.asOf,
  };
}
