import {
  getAlpacaChain,
  getAlpacaDailyBars,
  getAlpacaSpots,
  hasAlpacaCredentials,
} from "@/lib/providers/alpaca";
import { getCboeChain, getCboeDailyBars } from "@/lib/providers/cboe";
import type { Chain, DailyBar } from "@/lib/types";

/**
 * Chain for a single-symbol view: Alpaca first when credentials exist,
 * keyless Cboe delayed chain otherwise (and as fallback on any Alpaca error).
 */
export async function getChain(symbol: string): Promise<Chain> {
  if (hasAlpacaCredentials()) {
    try {
      return await getAlpacaChain(symbol);
    } catch {
      // fall through to Cboe
    }
  }
  return getCboeChain(symbol);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        try {
          results[index] = { status: "fulfilled", value: await fn(items[index]) };
        } catch (reason) {
          results[index] = { status: "rejected", reason };
        }
      }
    }),
  );
  return results;
}

export type ScanResult = {
  chains: Chain[];
  failed: string[];
};

/**
 * Chains for a universe scan batch. Chains always come from Cboe (one request
 * per symbol, full greeks + OI); when Alpaca credentials exist, the delayed
 * Cboe spot is upgraded to Alpaca's real-time IEX price in a single batch call.
 */
export async function getScanChains(symbols: string[]): Promise<ScanResult> {
  const [settled, spots] = await Promise.all([
    mapWithConcurrency(symbols, 8, getCboeChain),
    hasAlpacaCredentials()
      ? getAlpacaSpots(symbols).catch(() => ({}) as Record<string, number>)
      : Promise.resolve({} as Record<string, number>),
  ]);

  const chains: Chain[] = [];
  const failed: string[] = [];
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      const chain = result.value;
      const liveSpot = spots[chain.symbol];
      chains.push(liveSpot ? { ...chain, spot: liveSpot } : chain);
    } else {
      failed.push(symbols[index]);
    }
  });

  return { chains, failed };
}

export async function getDailyBars(symbol: string, limit = 400): Promise<DailyBar[]> {
  if (hasAlpacaCredentials()) {
    try {
      const bars = await getAlpacaDailyBars(symbol, limit);
      if (bars.length > 0) return bars;
    } catch {
      // fall through to Cboe
    }
  }
  return getCboeDailyBars(symbol, limit);
}
