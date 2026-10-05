import type { SymbolMeta } from "@/lib/types";

/**
 * VORTEX_DOCTRINE.md Section II.A, as code. The scanner's doctrine preset
 * reads these instead of the static filter fields, so the mandate follows
 * the live VIX the way the desk does by hand.
 */

export const DOCTRINE_DTE: [number, number] = [30, 45];

/** Delta band by VIX regime (Section II.A). */
export function deltaBandForVix(vix: number | null): [number, number] {
  if (vix === null) return [0.2, 0.35];
  if (vix < 18) return [0.2, 0.35];
  if (vix < 25) return [0.15, 0.25];
  return [0.1, 0.2];
}

/**
 * Two-tier ROI floor adopted 2026-10-01: non-tech Tier 1A may fire at 2.25%
 * while VIX < 18; tech stays 3%; VIX at or above 18 is 3% for everything.
 */
export function rocGateFor(techSector: boolean, vix: number | null): number {
  if (techSector) return 0.03;
  if (vix !== null && vix < 18) return 0.0225;
  return 0.03;
}

/**
 * Sectors counted against the tech cap. Communication-services platforms
 * trade as tech for exposure purposes, so the four large ones are listed
 * explicitly rather than pulling in telcos and cable with the sector tag.
 */
const TECH_SECTORS = new Set(["Technology", "Semiconductors"]);
const TECH_OVERRIDES = new Set(["GOOGL", "GOOG", "META", "NFLX", "AMZN"]);

export function isTechSector(meta: Pick<SymbolMeta, "symbol" | "sector"> | undefined): boolean {
  if (!meta) return false;
  return TECH_SECTORS.has(meta.sector) || TECH_OVERRIDES.has(meta.symbol);
}

/** Below this open interest or above this spread the quoted mid is noise. */
export const THIN_OPEN_INTEREST = 100;
export const THIN_SPREAD_PCT = 0.15;

export function isThinMarket(openInterest: number | null, spreadPct: number | null): boolean {
  return (openInterest ?? 0) < THIN_OPEN_INTEREST || (spreadPct ?? 1) > THIN_SPREAD_PCT;
}

/** Sector caps (Section III): 35% default, tech 55% with a 60% hard stop. */
export const TECH_CAP_PCT = 0.55;
export const TECH_HARD_STOP_PCT = 0.6;
export const SINGLE_NAME_CAP_PCT = 0.2;
export const MARGIN_CAP_PCT = 0.1;
