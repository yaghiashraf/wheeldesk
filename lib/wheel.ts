import { bsDelta, probabilityItm, realizedVol } from "@/lib/bs";
import { daysToExpiration } from "@/lib/occ";
import { getSymbolMeta } from "@/lib/universe";
import type {
  Chain,
  ContractQuote,
  FundamentalSnapshot,
  ScreenerFilters,
  ScreenerRow,
  Strategy,
} from "@/lib/types";

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Chooses the strongest contracts within one symbol after hard mandate gates. */
function contractPriority(row: ScreenerRow): number {
  const normalize = (value: number) => Math.min(1, Math.max(0, value));
  const annualized = normalize((row.rocAnnualized - 0.05) / 0.3);
  const buffer = normalize(row.otmPct / 0.2);
  const spread = normalize((0.2 - (row.spreadPct ?? 0.2)) / 0.18);
  const openInterest = normalize((Math.log10(Math.max(1, row.openInterest ?? 0)) - 2) / 2);
  const volBasis = row.ivRv ?? row.ivToIv30 ?? row.iv ?? 0;
  const volEdge = normalize((volBasis - 0.7) / 0.9);
  const carry = annualized * 0.6 + buffer * 0.4;
  const execution = spread * 0.55 + openInterest * 0.45;
  return carry * 0.45 + execution * 0.35 + volEdge * 0.2;
}

type BuildRowsArgs = {
  chain: Chain;
  strategy: Strategy;
  filters: ScreenerFilters;
  /** 30-day realized vol (decimal) for the underlying, when history is available */
  realizedVol30: number | null;
  earningsDate: string | null;
  exDivDate: string | null;
  eventDataAvailable: boolean;
  fundamentals: FundamentalSnapshot;
};

function withinWindow(date: string | null, expiration: string): string | null {
  if (!date) return null;
  const today = new Date().toISOString().slice(0, 10);
  return date >= today && date <= expiration ? date : null;
}

export function buildRows(args: BuildRowsArgs): ScreenerRow[] {
  const { chain, strategy, filters } = args;
  const meta = getSymbolMeta(chain.symbol);
  const wantedType = strategy === "csp" ? "put" : "call";
  const now = new Date();
  const rows: ScreenerRow[] = [];

  for (const contract of chain.contracts) {
    if (contract.type !== wantedType) continue;

    const dte = daysToExpiration(contract.expiration, now);
    if (dte < filters.minDte || dte > filters.maxDte) continue;

    // Must be sellable: a real bid and a computable mid.
    if (contract.bid === null || contract.bid < 0.05 || contract.ask === null) continue;
    const mid = round((contract.bid + contract.ask) / 2, 2);
    if (mid <= 0) continue;

    const t = dte / 365;
    const delta =
      contract.delta ??
      (contract.iv
        ? bsDelta(contract.type, { spot: chain.spot, strike: contract.strike, iv: contract.iv, t })
        : null);
    if (delta === null) continue;
    const absDelta = Math.abs(delta);
    if (absDelta < filters.minDelta || absDelta > filters.maxDelta) continue;

    const otmPct =
      strategy === "csp"
        ? (chain.spot - contract.strike) / chain.spot
        : (contract.strike - chain.spot) / chain.spot;
    if (filters.otmOnly && otmPct <= 0) continue;

    const openInterest = contract.openInterest ?? 0;
    if (openInterest < filters.minOpenInterest) continue;

    const spreadPct = mid > 0 ? round((contract.ask - contract.bid) / mid, 4) : null;
    if (
      filters.maxSpreadPct !== null &&
      spreadPct !== null &&
      spreadPct > filters.maxSpreadPct
    ) {
      continue;
    }

    const collateralPerShare = strategy === "csp" ? contract.strike : chain.spot;
    const roc = mid / collateralPerShare;
    if (roc < filters.minRoc) continue;
    const rocAnnualized = roc * (365 / Math.max(dte, 1));

    const earningsDate = withinWindow(args.earningsDate, contract.expiration);
    if (filters.avoidEarnings && earningsDate) continue;

    const pItm = contract.iv
      ? probabilityItm(contract.type, {
          spot: chain.spot,
          strike: contract.strike,
          iv: contract.iv,
          t,
        })
      : null;

    const ivRv =
      contract.iv && args.realizedVol30 && args.realizedVol30 > 0
        ? round(contract.iv / args.realizedVol30, 2)
        : null;

    const ivToIv30 =
      contract.iv && chain.iv30 && chain.iv30 > 0
        ? round(contract.iv / chain.iv30, 2)
        : null;

    const row: ScreenerRow = {
      occSymbol: contract.occSymbol,
      symbol: chain.symbol,
      name: meta?.name ?? chain.symbol,
      sector: meta?.sector ?? "—",
      kind: meta?.kind ?? "stock",
      strategy,
      spot: round(chain.spot, 2),
      strike: contract.strike,
      expiration: contract.expiration,
      dte,
      bid: contract.bid,
      ask: contract.ask,
      mid,
      premium: round(mid * 100, 0),
      delta: round(delta, 4),
      iv: contract.iv,
      ivRv,
      iv30: chain.iv30,
      ivToIv30,
      spreadPct,
      roc: round(roc, 4),
      rocAnnualized: round(rocAnnualized, 4),
      pItm: pItm === null ? null : round(pItm, 4),
      breakeven: round(
        strategy === "csp" ? contract.strike - mid : chain.spot - mid,
        2,
      ),
      otmPct: round(otmPct, 4),
      openInterest: contract.openInterest,
      volume: contract.volume,
      earningsDate,
      exDivDate: withinWindow(args.exDivDate, contract.expiration),
      eventDataAvailable: args.eventDataAvailable,
      chainAsOf: chain.asOf,
      fundamentals: args.fundamentals,
    };

    rows.push(row);
  }

  rows.sort((a, b) => contractPriority(b) - contractPriority(a));
  return rows.slice(0, Math.max(1, filters.maxPerSymbol));
}

export function realizedVol30FromCloses(closes: number[]): number | null {
  return realizedVol(closes, 30);
}

/** Series of trailing 30-day realized vols, for HV context charts. */
export function realizedVolSeries(
  bars: Array<{ date: string; close: number }>,
  window = 30,
): Array<{ date: string; rv: number }> {
  const series: Array<{ date: string; rv: number }> = [];
  const closes = bars.map((bar) => bar.close);
  for (let i = window; i < bars.length; i++) {
    const rv = realizedVol(closes.slice(0, i + 1), window);
    if (rv !== null) {
      series.push({ date: bars[i].date, rv });
    }
  }
  return series;
}

export type ContractPick = ContractQuote & { dte: number; absDelta: number | null };

/** Contracts of one type inside a delta band, grouped by expiration — the deep-dive ladder. */
export function strikeLadder(
  chain: Chain,
  type: "put" | "call",
  deltaLow = 0.08,
  deltaHigh = 0.35,
  maxExpirations = 3,
): Map<string, ContractPick[]> {
  const now = new Date();
  const byExpiration = new Map<string, ContractPick[]>();

  for (const contract of chain.contracts) {
    if (contract.type !== type) continue;
    const dte = daysToExpiration(contract.expiration, now);
    if (dte < 7 || dte > 75) continue;
    if (contract.bid === null || contract.bid <= 0) continue;

    const delta =
      contract.delta ??
      (contract.iv
        ? bsDelta(type, {
            spot: chain.spot,
            strike: contract.strike,
            iv: contract.iv,
            t: dte / 365,
          })
        : null);
    const absDelta = delta === null ? null : Math.abs(delta);
    if (absDelta === null || absDelta < deltaLow || absDelta > deltaHigh) continue;

    const picks = byExpiration.get(contract.expiration) ?? [];
    picks.push({ ...contract, dte, absDelta });
    byExpiration.set(contract.expiration, picks);
  }

  const expirations = [...byExpiration.keys()].sort().slice(0, maxExpirations);
  const ladder = new Map<string, ContractPick[]>();
  for (const expiration of expirations) {
    ladder.set(
      expiration,
      byExpiration.get(expiration)!.sort((a, b) => a.strike - b.strike),
    );
  }
  return ladder;
}
