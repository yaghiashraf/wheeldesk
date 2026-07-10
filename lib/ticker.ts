import { probabilityItm } from "@/lib/bs";
import { getChain, getDailyBars } from "@/lib/chain";
import { getSymbolMeta } from "@/lib/universe";
import { realizedVol30FromCloses, realizedVolSeries, strikeLadder } from "@/lib/wheel";
import type { DataSource, OptionType } from "@/lib/types";

export type LadderRow = {
  occSymbol: string;
  expiration: string;
  dte: number;
  strike: number;
  bid: number | null;
  ask: number | null;
  mid: number;
  absDelta: number | null;
  iv: number | null;
  roc: number;
  rocAnnualized: number;
  pItm: number | null;
  breakeven: number;
  openInterest: number | null;
};

export type ExpirationLadder = {
  expiration: string;
  dte: number;
  rows: LadderRow[];
};

export type TickerData = {
  symbol: string;
  name: string;
  sector: string;
  spot: number;
  asOf: string;
  source: DataSource;
  /** Underlying 30-day IV (vendor iv30, or ATM contract IV as fallback), decimal */
  iv30: number | null;
  /** 30-day realized vol, decimal */
  rv30: number | null;
  ivRv: number | null;
  bars: Array<{ date: string; close: number }>;
  rvSeries: Array<{ date: string; rv: number }>;
  putLadders: ExpirationLadder[];
  callLadders: ExpirationLadder[];
};

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export async function getTickerData(rawSymbol: string): Promise<TickerData | null> {
  const symbol = rawSymbol.toUpperCase();
  let chain;
  try {
    chain = await getChain(symbol);
  } catch {
    return null;
  }

  let bars: Array<{ date: string; close: number }> = [];
  let rvSeries: Array<{ date: string; rv: number }> = [];
  let rv30: number | null = null;
  try {
    const daily = await getDailyBars(symbol, 400);
    rv30 = realizedVol30FromCloses(daily.map((bar) => bar.close));
    rvSeries = realizedVolSeries(daily).slice(-126);
    bars = daily.slice(-126).map((bar) => ({ date: bar.date, close: bar.close }));
  } catch {
    // Charts that need history simply don't render.
  }

  const spot = chain.spot;

  const toLadders = (type: OptionType): ExpirationLadder[] => {
    const ladder = strikeLadder(chain, type);
    return [...ladder.entries()].map(([expiration, picks]) => ({
      expiration,
      dte: picks[0]?.dte ?? 0,
      rows: picks.map((pick) => {
        const mid =
          pick.bid !== null && pick.ask !== null
            ? round((pick.bid + pick.ask) / 2, 2)
            : (pick.bid ?? pick.ask ?? 0);
        const collateral = type === "put" ? pick.strike : spot;
        const roc = collateral > 0 ? mid / collateral : 0;
        return {
          occSymbol: pick.occSymbol,
          expiration,
          dte: pick.dte,
          strike: pick.strike,
          bid: pick.bid,
          ask: pick.ask,
          mid,
          absDelta: pick.absDelta,
          iv: pick.iv,
          roc: round(roc, 4),
          rocAnnualized: round(roc * (365 / Math.max(pick.dte, 1)), 4),
          pItm: pick.iv
            ? probabilityItm(type, {
                spot,
                strike: pick.strike,
                iv: pick.iv,
                t: pick.dte / 365,
              })
            : null,
          breakeven: round(type === "put" ? pick.strike - mid : spot - mid, 2),
          openInterest: pick.openInterest,
        };
      }),
    }));
  };

  // ATM IV fallback: nearest-strike contract in the front ladder expiration.
  const putLadders = toLadders("put");
  const callLadders = toLadders("call");
  let iv30 = chain.iv30;
  if (iv30 === null) {
    const candidates = [...putLadders, ...callLadders]
      .flatMap((ladder) => ladder.rows)
      .filter((row) => row.iv !== null)
      .sort((a, b) => Math.abs(a.strike - spot) - Math.abs(b.strike - spot));
    iv30 = candidates[0]?.iv ?? null;
  }

  const meta = getSymbolMeta(symbol);
  return {
    symbol,
    name: meta?.name ?? symbol,
    sector: meta?.sector ?? "—",
    spot: round(spot, 2),
    asOf: chain.asOf,
    source: chain.source,
    iv30,
    rv30,
    ivRv: iv30 && rv30 && rv30 > 0 ? round(iv30 / rv30, 2) : null,
    bars,
    rvSeries,
    putLadders,
    callLadders,
  };
}
