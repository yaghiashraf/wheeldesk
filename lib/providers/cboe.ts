import { parseOccSymbol } from "@/lib/occ";
import type { Chain, ContractQuote, DailyBar, RegimeInfo, VixRegime } from "@/lib/types";

const CBOE_ROOT = "https://cdn.cboe.com/api/global/delayed_quotes";

const CHAIN_REVALIDATE_SECONDS = 600;
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

async function cboeFetch<T>(path: string, revalidate: number): Promise<T> {
  const response = await fetch(`${CBOE_ROOT}${path}`, {
    next: { revalidate },
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Cboe request for ${path} failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

function toNumberOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function getCboeChain(symbol: string): Promise<Chain> {
  const payload = await cboeFetch<CboeChainPayload>(
    `/options/${encodeURIComponent(symbol.toUpperCase())}.json`,
    CHAIN_REVALIDATE_SECONDS,
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
  return {
    symbol: symbol.toUpperCase(),
    spot,
    asOf: cboeTimestampToIso(payload.timestamp),
    source: "cboe",
    iv30: iv30 && iv30 > 0 ? iv30 / 100 : null,
    contracts,
  };
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
  const payload = await cboeFetch<CboeChainPayload>(`/options/_VIX.json`, VIX_REVALIDATE_SECONDS);
  const vix = toNumberOrNull(payload.data.current_price) ?? toNumberOrNull(payload.data.close);
  if (vix === null || vix <= 0) {
    throw new Error("Cboe returned no usable VIX value");
  }
  return {
    vix,
    regime: classifyVix(vix),
    asOf: cboeTimestampToIso(payload.timestamp),
  };
}
