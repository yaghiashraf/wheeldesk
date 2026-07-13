import { defaultFilters } from "@/lib/defaults";
import type { ScreenerFilters, Strategy } from "@/lib/types";

/**
 * Filters serialize to/from URL search params so scans are shareable links
 * and the screener API takes the exact same query the page shows.
 */

function num(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key);
  if (raw === null || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function bool(params: URLSearchParams, key: string): boolean | null {
  const raw = params.get(key);
  if (raw === null) return null;
  return raw === "1" || raw === "true";
}

export function filtersFromParams(
  params: URLSearchParams,
  strategy: Strategy,
): ScreenerFilters {
  const base = defaultFilters(strategy);

  const maxSpreadRaw = num(params, "maxSpread");
  return {
    ...base,
    minDte: num(params, "minDte") ?? base.minDte,
    maxDte: num(params, "maxDte") ?? base.maxDte,
    minDelta: num(params, "minDelta") ?? base.minDelta,
    maxDelta: num(params, "maxDelta") ?? base.maxDelta,
    minRoc: num(params, "minRoc") ?? base.minRoc,
    minOpenInterest: num(params, "minOi") ?? base.minOpenInterest,
    maxSpreadPct: params.get("maxSpread") === "off" ? null : (maxSpreadRaw ?? base.maxSpreadPct),
    otmOnly: bool(params, "otm") ?? base.otmOnly,
    avoidEarnings: bool(params, "avoidEarnings") ?? base.avoidEarnings,
    maxPerSymbol: num(params, "maxPerSymbol") ?? base.maxPerSymbol,
    maxValuationPercentile:
      num(params, "maxValuation") ?? base.maxValuationPercentile,
    minQualityScore: num(params, "minQuality") ?? base.minQualityScore,
    minExpectedMoveCoverage:
      num(params, "minMoveCoverage") ?? base.minExpectedMoveCoverage,
    stocksOnly: bool(params, "stocksOnly") ?? base.stocksOnly,
  };
}

/** Only values that differ from the transparent starting mandate reach the URL. */
export function filtersToParams(filters: ScreenerFilters): URLSearchParams {
  const base = defaultFilters(filters.strategy);
  const params = new URLSearchParams();
  if (filters.minDte !== base.minDte) params.set("minDte", String(filters.minDte));
  if (filters.maxDte !== base.maxDte) params.set("maxDte", String(filters.maxDte));
  if (filters.minDelta !== base.minDelta) params.set("minDelta", String(filters.minDelta));
  if (filters.maxDelta !== base.maxDelta) params.set("maxDelta", String(filters.maxDelta));
  if (filters.minRoc !== base.minRoc) params.set("minRoc", String(filters.minRoc));
  if (filters.minOpenInterest !== base.minOpenInterest) {
    params.set("minOi", String(filters.minOpenInterest));
  }
  if (filters.maxSpreadPct !== base.maxSpreadPct) {
    params.set("maxSpread", filters.maxSpreadPct === null ? "off" : String(filters.maxSpreadPct));
  }
  if (filters.otmOnly !== base.otmOnly) params.set("otm", filters.otmOnly ? "1" : "0");
  if (filters.avoidEarnings !== base.avoidEarnings) {
    params.set("avoidEarnings", filters.avoidEarnings ? "1" : "0");
  }
  if (filters.maxPerSymbol !== base.maxPerSymbol) {
    params.set("maxPerSymbol", String(filters.maxPerSymbol));
  }
  if (filters.maxValuationPercentile !== base.maxValuationPercentile) {
    params.set("maxValuation", String(filters.maxValuationPercentile));
  }
  if (filters.minQualityScore !== base.minQualityScore) {
    params.set("minQuality", String(filters.minQualityScore));
  }
  if (filters.minExpectedMoveCoverage !== base.minExpectedMoveCoverage) {
    params.set("minMoveCoverage", String(filters.minExpectedMoveCoverage));
  }
  if (filters.stocksOnly !== base.stocksOnly) {
    params.set("stocksOnly", filters.stocksOnly ? "1" : "0");
  }
  return params;
}
