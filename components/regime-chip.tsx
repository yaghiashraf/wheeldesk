import type { RegimeInfo } from "@/lib/types";

const REGIME_STYLE: Record<RegimeInfo["regime"], { label: string; className: string }> = {
  calm: { label: "Calm", className: "text-teal border-teal/40 bg-teal/10" },
  normal: { label: "Normal", className: "text-cyan border-cyan/40 bg-cyan/10" },
  elevated: { label: "Elevated", className: "text-amber border-amber/40 bg-amber/10" },
  stressed: { label: "Stressed", className: "text-coral border-coral/40 bg-coral/10" },
};

export function RegimeChip({
  regime,
  loading = false,
}: {
  regime: RegimeInfo | null;
  loading?: boolean;
}) {
  if (!regime) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-edge px-3 py-1 text-xs text-ink-3">
        {loading ? "Loading VIX…" : "VIX unavailable"}
      </span>
    );
  }
  const style = REGIME_STYLE[regime.regime];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${style.className}`}
      title="Current Cboe Volatility Index and market-volatility regime. VIX is context only and does not silently change the research mandate."
    >
      <span className="num font-medium">VIX {regime.vix.toFixed(2)}</span>
      <span className="opacity-80">· {style.label}</span>
    </span>
  );
}
