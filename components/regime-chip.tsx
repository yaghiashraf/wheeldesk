import type { RegimeInfo } from "@/lib/types";

const REGIME_STYLE: Record<RegimeInfo["regime"], { label: string; className: string }> = {
  calm: { label: "Calm", className: "text-teal border-teal/40 bg-teal/10" },
  normal: { label: "Normal", className: "text-cyan border-cyan/40 bg-cyan/10" },
  elevated: { label: "Elevated", className: "text-amber border-amber/40 bg-amber/10" },
  stressed: { label: "Stressed", className: "text-coral border-coral/40 bg-coral/10" },
};

export function RegimeChip({ regime }: { regime: RegimeInfo | null }) {
  if (!regime) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-edge px-3 py-1 text-xs text-ink-3">
        VIX unavailable
      </span>
    );
  }
  const style = REGIME_STYLE[regime.regime];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${style.className}`}
      title="Cboe Volatility Index regime. Presets auto-tune their delta band and minimum ROC to this."
    >
      <span className="num font-medium">VIX {regime.vix.toFixed(2)}</span>
      <span className="opacity-80">· {style.label}</span>
    </span>
  );
}
