import {
  ChevronDown,
  Download,
  ListFilter,
  Play,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { RegimeChip } from "@/components/regime-chip";
import { fmtPct } from "@/lib/format";
import type { RegimeInfo, ScreenerFilters } from "@/lib/types";

type ScreenerControlsProps = {
  draftFilters: ScreenerFilters;
  regime: RegimeInfo | null;
  filtersOpen: boolean;
  dirty: boolean;
  validationError: string | null;
  scanning: boolean;
  hasRows: boolean;
  onUpdate: (patch: Partial<ScreenerFilters>) => void;
  onToggleFilters: () => void;
  onReset: () => void;
  onRun: () => void;
  onExport: () => void;
};

export function ScreenerControls({
  draftFilters,
  regime,
  filtersOpen,
  dirty,
  validationError,
  scanning,
  hasRows,
  onUpdate,
  onToggleFilters,
  onReset,
  onRun,
  onExport,
}: ScreenerControlsProps) {
  const activeSummary = `${draftFilters.minDte}–${draftFilters.maxDte} DTE · Δ ${draftFilters.minDelta.toFixed(2)}–${draftFilters.maxDelta.toFixed(2)} · ROC ≥ ${(draftFilters.minRoc * 100).toFixed(1)}% · buffer ≥ ${draftFilters.minExpectedMoveCoverage.toFixed(2)}× expected move`;

  return (
    <section className="overflow-hidden rounded-lg border border-edge bg-panel">
      <div className="flex items-center gap-3 border-b border-edge px-4 py-2.5">
        <ShieldCheck className="h-4 w-4 text-cyan" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-ink">Research mandate</p>
          <p className="hidden text-[10px] text-ink-3 sm:block">
            Explicit constraints only · volatility regime never changes filters silently
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex"><RegimeChip regime={regime} /></span>
          <button
            type="button"
            onClick={onToggleFilters}
            aria-expanded={filtersOpen}
            className="inline-flex h-8 items-center gap-1.5 rounded border border-edge-2 px-2.5 text-xs font-medium text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink sm:hidden"
          >
            <ListFilter className="h-3.5 w-3.5" />
            Constraints
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="border-b border-edge px-4 py-3 sm:hidden">
        <p className="num text-[11px] leading-relaxed text-ink-2">{activeSummary}</p>
      </div>

      <div
        className={`${filtersOpen ? "grid" : "hidden sm:grid"} grid-cols-2 divide-x divide-edge lg:grid-cols-[1.2fr_1.1fr_1fr]`}
      >
        <ControlGroup title="Contract mandate">
          <NumberField
            label="Min DTE"
            value={draftFilters.minDte}
            onChange={(value) => onUpdate({ minDte: value })}
          />
          <NumberField
            label="Max DTE"
            value={draftFilters.maxDte}
            onChange={(value) => onUpdate({ maxDte: value })}
          />
          <NumberField
            label="Min |delta|"
            value={draftFilters.minDelta}
            step={0.01}
            onChange={(value) => onUpdate({ minDelta: value })}
          />
          <NumberField
            label="Max |delta|"
            value={draftFilters.maxDelta}
            step={0.01}
            onChange={(value) => onUpdate({ maxDelta: value })}
          />
          <NumberField
            label="Min ROC %"
            value={Number((draftFilters.minRoc * 100).toFixed(2))}
            step={0.1}
            onChange={(value) => onUpdate({ minRoc: value / 100 })}
          />
        </ControlGroup>

        <ControlGroup title="Assignment underwrite">
          <NumberField
            label="Min buffer / move"
            value={draftFilters.minExpectedMoveCoverage}
            step={0.05}
            onChange={(value) =>
              onUpdate({ minExpectedMoveCoverage: Math.max(0, Math.min(3, value)) })
            }
          />
          <NumberField
            label="Max valuation pct"
            value={draftFilters.maxValuationPercentile}
            step={5}
            onChange={(value) =>
              onUpdate({ maxValuationPercentile: Math.max(0, Math.min(100, value)) })
            }
          />
          <NumberField
            label="Min quality"
            value={draftFilters.minQualityScore}
            step={5}
            onChange={(value) =>
              onUpdate({ minQualityScore: Math.max(0, Math.min(100, value)) })
            }
          />
          <NumberField
            label="Max / symbol"
            value={draftFilters.maxPerSymbol}
            onChange={(value) =>
              onUpdate({ maxPerSymbol: Math.max(1, Math.round(value)) })
            }
          />
          <Toggle
            label="Stocks only"
            checked={draftFilters.stocksOnly}
            onChange={(checked) => onUpdate({ stocksOnly: checked })}
          />
        </ControlGroup>

        <ControlGroup title="Execution & events">
          <NumberField
            label="Min OI"
            value={draftFilters.minOpenInterest}
            step={50}
            onChange={(value) => onUpdate({ minOpenInterest: value })}
          />
          <NumberField
            label="Max spread %"
            value={Number(((draftFilters.maxSpreadPct ?? 0.15) * 100).toFixed(1))}
            step={1}
            onChange={(value) => onUpdate({ maxSpreadPct: value / 100 })}
          />
          <Toggle
            label="OTM only"
            checked={draftFilters.otmOnly}
            onChange={(checked) => onUpdate({ otmOnly: checked })}
          />
          <Toggle
            label="Avoid known earnings"
            checked={draftFilters.avoidEarnings}
            onChange={(checked) => onUpdate({ avoidEarnings: checked })}
          />
          <Toggle
            label={`Spread gate ${
              draftFilters.maxSpreadPct === null
                ? "off"
                : fmtPct(draftFilters.maxSpreadPct, 0)
            }`}
            checked={draftFilters.maxSpreadPct !== null}
            onChange={(checked) => onUpdate({ maxSpreadPct: checked ? 0.15 : null })}
          />
        </ControlGroup>
      </div>

      <div
        className={`${filtersOpen ? "flex" : "hidden sm:flex"} flex-wrap items-center gap-3 border-t border-edge px-4 py-2.5`}
      >
        {validationError ? (
          <span className="text-xs text-coral">{validationError}</span>
        ) : dirty ? (
          <span className="text-xs text-amber">Mandate changed · run to apply</span>
        ) : (
          <span className="text-xs text-ink-3">All constraints applied</span>
        )}
        <span className="hidden text-[10px] text-ink-3 lg:inline">
          Valuation uses independent peers; cyclical sectors use normalized earnings.
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-8 items-center gap-1.5 rounded border border-edge px-2.5 text-xs text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={!hasRows}
            className="inline-flex h-8 items-center gap-1.5 rounded border border-edge px-2.5 text-xs text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <RunButton
            scanning={scanning}
            dirty={dirty}
            disabled={validationError !== null}
            onRun={onRun}
          />
        </div>
      </div>
    </section>
  );
}

function ControlGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="col-span-2 grid grid-cols-2 gap-3 px-4 py-3 sm:col-span-1 sm:grid-cols-3 lg:grid-cols-3">
      <legend className="col-span-full mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink-2">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function MobileScanBar({
  summary,
  scanning,
  dirty,
  disabled,
  onFilters,
  onRun,
}: {
  summary: string;
  scanning: boolean;
  dirty: boolean;
  disabled: boolean;
  onFilters: () => void;
  onRun: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-2 border-t border-edge bg-desk/95 p-2 backdrop-blur sm:hidden">
      <button
        type="button"
        onClick={onFilters}
        className="flex min-w-0 flex-1 items-center gap-2 rounded border border-edge bg-panel px-3 text-left"
      >
        <ListFilter className="h-4 w-4 shrink-0 text-ink-2" />
        <span className="min-w-0">
          <span className="block text-xs font-medium text-ink">Research mandate</span>
          <span className="num block truncate text-[10px] text-ink-3">{summary}</span>
        </span>
      </button>
      <RunButton
        scanning={scanning}
        dirty={dirty}
        disabled={disabled}
        onRun={onRun}
        mobile
      />
    </div>
  );
}

function RunButton({
  scanning,
  dirty,
  disabled,
  onRun,
  mobile = false,
}: {
  scanning: boolean;
  dirty: boolean;
  disabled: boolean;
  onRun: () => void;
  mobile?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onRun}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded bg-cyan font-semibold text-black transition-[opacity,transform] hover:opacity-90 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 ${
        mobile ? "min-w-36 px-4 text-sm" : "h-8 px-4 text-xs"
      }`}
    >
      <Play className="h-3.5 w-3.5 fill-current" />
      {scanning && !dirty ? "Scanning…" : dirty ? "Run mandate" : "Run scan"}
    </button>
  );
}

function NumberField({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block truncate text-[9px] font-medium uppercase tracking-[0.12em] text-ink-3">
        {label}
      </span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
        className="num h-8 w-full rounded border border-edge bg-panel-2 px-2 text-xs text-ink outline-none transition-colors focus:border-cyan/70"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="col-span-1 inline-flex cursor-pointer items-end gap-2 pb-1 text-[11px] text-ink-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors ${
          checked ? "bg-cyan/80" : "bg-edge-2"
        }`}
      >
        <span
          className={`absolute left-0.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-ink shadow-sm transition-transform ${
            checked ? "translate-x-3.5" : "translate-x-0"
          }`}
        />
      </button>
      <span className="leading-tight">{label}</span>
    </label>
  );
}
