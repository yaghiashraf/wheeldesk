import { normCdf } from "@/lib/bs";
import breachData from "@/lib/data/historical-breach.json";
import type { ScreenerRow } from "@/lib/types";

/**
 * Measured base rates shown beside model estimates. Both tables are VCG
 * Research measurements, regenerated offline, never estimated in the browser:
 * - historical-breach.json from claude-code/vrp-timing/breach_table.py
 * - EARNINGS_TAIL from claude-code/filing-timing (announcement-window returns)
 */

type HorizonRates = {
  n: number;
  putFinish: number[];
  putTouch: number[];
  callFinish: number[];
  callTouch: number[];
};

type BreachTable = {
  from: string;
  to: string;
  underlyings: string[];
  horizons: number[];
  k: number[];
  pooled: Record<string, HorizonRates>;
  bySymbol: Record<string, { from: string; to: string; horizons: Record<string, HorizonRates> }>;
};

const TABLE: BreachTable = breachData;

/** Two-day return in excess of SPY across the earnings announcement window. */
export const EARNINGS_TAIL = {
  releases: 19_513,
  fromYear: 2016,
  toYear: 2026,
  worseThanMinus10: 0.0494,
  betterThanPlus10: 0.0463,
} as const;

export type BreachEvidence = {
  /** Strike distance in IV30 standard deviations over the contract's DTE. */
  sigmas: number;
  /** True when the strike sits beyond the measured grid, so rates are upper bounds. */
  beyondGrid: boolean;
  finish: number;
  touch: number;
  /** Zero-drift lognormal probability at the same IV30 sigma, for a like-for-like read. */
  lognormal: number;
  /** Same measurement on this underlying's own IV index, when Cboe publishes one. */
  ownFinish: number | null;
  observations: number;
  fromYear: number;
  toYear: number;
  underlyingCount: number;
};

function interpolate(values: number[], grid: number[], x: number): number {
  const upper = grid.findIndex((point) => point >= x);
  if (upper === -1) return values[values.length - 1];
  if (upper === 0) return values[0];
  const lower = upper - 1;
  const weight = (x - grid[lower]) / (grid[upper] - grid[lower]);
  return values[lower] + (values[upper] - values[lower]) * weight;
}

function rateAt(
  horizons: Record<string, HorizonRates>,
  field: keyof Omit<HorizonRates, "n">,
  dte: number,
  sigmas: number,
): number {
  const byHorizon = TABLE.horizons.map((horizon) =>
    interpolate(horizons[String(horizon)][field], TABLE.k, sigmas),
  );
  return interpolate(byHorizon, TABLE.horizons, dte);
}

/**
 * How often, historically, a strike this many IV30 sigmas out finished beyond
 * the strike. Null outside the measured 14–60 DTE window, for in-the-money
 * strikes, and without an underlying IV30 to express the distance in.
 */
export function historicalBreach(row: ScreenerRow): BreachEvidence | null {
  const minHorizon = TABLE.horizons[0];
  const maxHorizon = TABLE.horizons[TABLE.horizons.length - 1];
  if (row.iv30 === null || row.iv30 <= 0 || row.dte < minHorizon || row.dte > maxHorizon) {
    return null;
  }
  const sd = row.iv30 * Math.sqrt(row.dte / 365);
  const logDistance =
    row.strategy === "csp" ? Math.log(row.spot / row.strike) : Math.log(row.strike / row.spot);
  const rawSigmas = logDistance / sd;
  if (rawSigmas < 0) return null;

  const maxK = TABLE.k[TABLE.k.length - 1];
  const sigmas = Math.min(rawSigmas, maxK);
  const finishField = row.strategy === "csp" ? "putFinish" : "callFinish";
  const touchField = row.strategy === "csp" ? "putTouch" : "callTouch";
  const own = TABLE.bySymbol[row.symbol];
  const drift = sd / 2;
  const nearestHorizon = TABLE.horizons.reduce((best, horizon) =>
    Math.abs(horizon - row.dte) < Math.abs(best - row.dte) ? horizon : best,
  );

  return {
    sigmas: rawSigmas,
    beyondGrid: rawSigmas > maxK,
    finish: rateAt(TABLE.pooled, finishField, row.dte, sigmas),
    touch: rateAt(TABLE.pooled, touchField, row.dte, sigmas),
    lognormal:
      row.strategy === "csp" ? normCdf(-rawSigmas + drift) : normCdf(-rawSigmas - drift),
    ownFinish: own ? rateAt(own.horizons, finishField, row.dte, sigmas) : null,
    observations: TABLE.pooled[String(nearestHorizon)].n,
    fromYear: Number(TABLE.from.slice(0, 4)),
    toYear: Number(TABLE.to.slice(0, 4)),
    underlyingCount: TABLE.underlyings.length,
  };
}
