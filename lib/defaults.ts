import type { ScreenerFilters, Strategy } from "@/lib/types";

/**
 * Transparent starting constraints, not a strategy or risk preset. The user
 * edits each mandate directly; VIX is displayed as context and never silently
 * changes these values.
 */
export function defaultFilters(strategy: Strategy): ScreenerFilters {
  return {
    strategy,
    minDte: 21,
    maxDte: 60,
    minDelta: 0.1,
    maxDelta: 0.3,
    // Minimum return for the contract period, not annualized: premium / capital committed.
    minRoc: 0.03,
    minOpenInterest: 250,
    maxSpreadPct: 0.15,
    otmOnly: true,
    avoidEarnings: true,
    maxPerSymbol: 2,
    maxValuationPercentile: 80,
    minQualityScore: 50,
    minExpectedMoveCoverage: 0.75,
    stocksOnly: false,
  };
}
