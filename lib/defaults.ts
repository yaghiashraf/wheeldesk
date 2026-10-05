import type { ScreenerFilters, Strategy } from "@/lib/types";

export type NamedScanPreset = "doctrine" | "conservative" | "balanced" | "high-premium";

export const SCAN_PRESETS: Array<{ id: NamedScanPreset; label: string }> = [
  { id: "doctrine", label: "Doctrine" },
  { id: "conservative", label: "Conservative" },
  { id: "balanced", label: "Balanced" },
  { id: "high-premium", label: "High premium" },
];

export function scanPresetFilters(
  strategy: Strategy,
  preset: NamedScanPreset,
): ScreenerFilters {
  const shared = {
    strategy,
    otmOnly: true,
    // Doctrine blocks earnings inside CSP DTE only; a covered call may run
    // through a print, so the call scan flags those rows instead of hiding them.
    avoidEarnings: strategy === "csp",
    maxPerSymbol: 1,
    stocksOnly: false,
    // Doctrine allows a fresh put only on Tier 1A, but covered-call repair
    // applies to anything already owned, so calls scan every tier.
    scope: strategy === "cc" ? "all" : "1a",
    doctrine: false,
  } as const;

  if (preset === "doctrine") {
    // VORTEX_DOCTRINE.md Section II.A. The delta band and the ROI floor shown
    // here are the VIX < 18 values; the server re-derives both from the live
    // VIX and the symbol's sector on every batch (see lib/doctrine.ts). OI and
    // spread gates are off because 30–45 DTE weeklies on most names carry no
    // open interest — thin contracts are priced at Black-Scholes fair value.
    return {
      ...shared,
      doctrine: true,
      minDte: 30,
      maxDte: 45,
      minDelta: 0.2,
      maxDelta: 0.35,
      minRoc: strategy === "cc" ? 0.03 : 0.0225,
      minOpenInterest: 0,
      maxSpreadPct: null,
      maxValuationPercentile: 80,
      minQualityScore: 40,
      minExpectedMoveCoverage: 0.5,
    };
  }

  if (preset === "conservative") {
    return {
      ...shared,
      minDte: 30,
      maxDte: 60,
      minDelta: 0.1,
      maxDelta: 0.2,
      minRoc: 0.0075,
      minOpenInterest: 500,
      maxSpreadPct: 0.1,
      maxValuationPercentile: 60,
      minQualityScore: 65,
      minExpectedMoveCoverage: 1,
    };
  }

  if (preset === "high-premium") {
    return {
      ...shared,
      minDte: 14,
      maxDte: 45,
      minDelta: 0.18,
      maxDelta: 0.35,
      minRoc: 0.02,
      minOpenInterest: 150,
      maxSpreadPct: 0.18,
      maxValuationPercentile: 90,
      minQualityScore: 40,
      minExpectedMoveCoverage: 0.5,
    };
  }

  return {
    ...shared,
    minDte: 21,
    maxDte: 60,
    minDelta: 0.1,
    maxDelta: 0.3,
    // Wide enough to surface quality discounts; ROI remains sortable and the
    // high-premium preset preserves a deliberate 2% period floor.
    minRoc: 0.01,
    minOpenInterest: 250,
    maxSpreadPct: 0.15,
    maxValuationPercentile: 80,
    minQualityScore: 50,
    minExpectedMoveCoverage: 0.75,
  };
}

/** Puts open on the doctrine mandate; calls keep the neutral balanced scan. */
export function defaultFilters(strategy: Strategy): ScreenerFilters {
  return scanPresetFilters(strategy, strategy === "csp" ? "doctrine" : "balanced");
}

const PRESET_KEYS: Array<keyof ScreenerFilters> = [
  "minDte",
  "maxDte",
  "minDelta",
  "maxDelta",
  "minRoc",
  "minOpenInterest",
  "maxSpreadPct",
  "otmOnly",
  "avoidEarnings",
  "maxPerSymbol",
  "maxValuationPercentile",
  "minQualityScore",
  "minExpectedMoveCoverage",
  "stocksOnly",
  "doctrine",
];

export function matchingScanPreset(
  filters: ScreenerFilters,
): NamedScanPreset | null {
  for (const preset of SCAN_PRESETS) {
    const candidate = scanPresetFilters(filters.strategy, preset.id);
    if (PRESET_KEYS.every((key) => filters[key] === candidate[key])) {
      return preset.id;
    }
  }
  return null;
}
