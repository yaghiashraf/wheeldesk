import type { ScoreParts } from "@/lib/types";

function scoreColor(score: number): string {
  if (score >= 70) return "text-teal border-teal/40 bg-teal/10";
  if (score >= 50) return "text-cyan border-cyan/40 bg-cyan/10";
  if (score >= 35) return "text-amber border-amber/40 bg-amber/10";
  return "text-ink-3 border-edge bg-panel-2";
}

const PART_LABELS: Array<[keyof ScoreParts, string, number]> = [
  ["yield", "Period yield", 25],
  ["annualized", "Annualized", 15],
  ["deltaFit", "Delta fit (0.10–0.30)", 20],
  ["liquidity", "Liquidity (OI + spread)", 15],
  ["ivRichness", "IV vs realized", 10],
  ["buffer", "OTM buffer", 10],
];

export function ScoreBadge({ score, parts }: { score: number; parts: ScoreParts }) {
  return (
    <span className="group relative inline-block">
      <span
        className={`num inline-block cursor-help rounded-md border px-2 py-0.5 text-sm font-semibold ${scoreColor(score)}`}
      >
        {score.toFixed(0)}
      </span>
      <span className="pointer-events-none absolute left-0 top-full z-50 mt-1 hidden w-60 rounded-lg border border-edge-2 bg-panel p-3 text-left shadow-2xl group-hover:block">
        <span className="mb-2 block text-[11px] uppercase tracking-wider text-ink-3">
          Score breakdown
        </span>
        {PART_LABELS.map(([key, label, max]) => (
          <span key={key} className="flex items-center justify-between gap-3 py-0.5 text-xs">
            <span className="text-ink-2">{label}</span>
            <span className="num text-ink">
              {parts[key].toFixed(1)}
              <span className="text-ink-3">/{max}</span>
            </span>
          </span>
        ))}
        {parts.earningsPenalty !== 0 && (
          <span className="flex items-center justify-between gap-3 py-0.5 text-xs">
            <span className="text-amber">Event penalty</span>
            <span className="num text-amber">{parts.earningsPenalty.toFixed(0)}</span>
          </span>
        )}
      </span>
    </span>
  );
}
