import { DEFAULT_PRESET, presetFilters, type PresetName } from "@/lib/presets";
import type { ScreenerFilters, Strategy, VixRegime } from "@/lib/types";

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

export function isPresetName(value: string | null): value is PresetName {
  return value === "wheel" || value === "conservative" || value === "balanced";
}

export function filtersFromParams(
  params: URLSearchParams,
  strategy: Strategy,
  regime: VixRegime = "normal",
): ScreenerFilters {
  const presetParam = params.get("preset");
  const preset: PresetName = isPresetName(presetParam) ? presetParam : DEFAULT_PRESET;
  const base = presetFilters(preset, strategy, regime);

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
  };
}

/** Only values that differ from the preset default are written to the URL. */
export function filtersToParams(
  filters: ScreenerFilters,
  preset: PresetName,
  regime: VixRegime = "normal",
): URLSearchParams {
  const base = presetFilters(preset, filters.strategy, regime);
  const params = new URLSearchParams();
  if (preset !== DEFAULT_PRESET) params.set("preset", preset);
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
  return params;
}
