import type { ScreenerFilters, Strategy } from "@/lib/types";

export type NamedScanPreset = "conservative" | "balanced" | "high-premium";

export const SCAN_PRESETS: Array<{ id: NamedScanPreset; label: string }> = [
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
    avoidEarnings: true,
    maxPerSymbol: 1,
    stocksOnly: false,
    // Doctrine allows a fresh put only on Tier 1A, but covered-call repair
    // applies to anything already owned, so calls scan every tier.
    allTiers: strategy === "cc",
  } as const;

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

/** Balanced is the neutral daily scan; presets never adapt silently to VIX. */
export function defaultFilters(strategy: Strategy): ScreenerFilters {
  return scanPresetFilters(strategy, "balanced");
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
