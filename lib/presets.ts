import type { ScreenerFilters, Strategy, VixRegime } from "@/lib/types";

export type PresetName = "wheel" | "conservative" | "balanced";

export const PRESET_LABELS: Record<PresetName, string> = {
  wheel: "Wheel",
  conservative: "Conservative",
  balanced: "Balanced",
};

const BASE_PRESETS: Record<PresetName, Omit<ScreenerFilters, "strategy">> = {
  // The default: 30-45 DTE, 0.10-0.30 |delta| premium selling on quality names.
  wheel: {
    minDte: 30,
    maxDte: 45,
    minDelta: 0.1,
    maxDelta: 0.3,
    minRoc: 0.006,
    minOpenInterest: 250,
    maxSpreadPct: 0.2,
    otmOnly: true,
    avoidEarnings: true,
    maxPerSymbol: 2,
  },
  conservative: {
    minDte: 30,
    maxDte: 45,
    minDelta: 0.08,
    maxDelta: 0.18,
    minRoc: 0.004,
    minOpenInterest: 500,
    maxSpreadPct: 0.12,
    otmOnly: true,
    avoidEarnings: true,
    maxPerSymbol: 2,
  },
  balanced: {
    minDte: 21,
    maxDte: 45,
    minDelta: 0.15,
    maxDelta: 0.3,
    minRoc: 0.008,
    minOpenInterest: 250,
    maxSpreadPct: 0.15,
    otmOnly: true,
    avoidEarnings: false,
    maxPerSymbol: 2,
  },
};

/**
 * VIX-regime tuning, documented on /learn: when volatility is elevated the
 * same premium is available further out of the money, so the delta band
 * shifts down; in stressed tape it shifts down harder and demands more ROC.
 */
function regimeAdjust(
  filters: Omit<ScreenerFilters, "strategy">,
  regime: VixRegime,
): Omit<ScreenerFilters, "strategy"> {
  switch (regime) {
    case "calm":
      return filters;
    case "normal":
      return filters;
    case "elevated":
      return {
        ...filters,
        minDelta: Math.max(0.05, filters.minDelta - 0.03),
        maxDelta: Math.max(0.12, filters.maxDelta - 0.03),
        minRoc: filters.minRoc * 1.25,
      };
    case "stressed":
      return {
        ...filters,
        minDelta: Math.max(0.05, filters.minDelta - 0.05),
        maxDelta: Math.max(0.1, filters.maxDelta - 0.07),
        minRoc: filters.minRoc * 1.5,
      };
  }
}

export function presetFilters(
  preset: PresetName,
  strategy: Strategy,
  regime: VixRegime = "normal",
): ScreenerFilters {
  return { strategy, ...regimeAdjust(BASE_PRESETS[preset], regime) };
}

export const DEFAULT_PRESET: PresetName = "wheel";
