import { ChevronDown, Download, ListFilter, Play, RotateCcw } from "lucide-react";
import { RegimeChip } from "@/components/regime-chip";
import { fmtPct } from "@/lib/format";
import { PRESET_LABELS, type PresetName } from "@/lib/presets";
import type { RegimeInfo, ScreenerFilters } from "@/lib/types";

type ScreenerControlsProps = {
  preset: PresetName;
  draftFilters: ScreenerFilters;
  regime: RegimeInfo | null;
  filtersOpen: boolean;
  dirty: boolean;
  validationError: string | null;
  scanning: boolean;
  hasRows: boolean;
  onPreset: (preset: PresetName) => void;
  onUpdate: (patch: Partial<ScreenerFilters>) => void;
  onToggleFilters: () => void;
  onReset: () => void;
  onRun: () => void;
  onExport: () => void;
};

export function ScreenerControls({
  preset,
  draftFilters,
  regime,
  filtersOpen,
  dirty,
  validationError,
  scanning,
  hasRows,
  onPreset,
  onUpdate,
  onToggleFilters,
  onReset,
  onRun,
  onExport,
}: ScreenerControlsProps) {
  const activeSummary = `${draftFilters.minDte}–${draftFilters.maxDte} DTE · Δ ${draftFilters.minDelta.toFixed(2)}–${draftFilters.maxDelta.toFixed(2)} · ROC ≥ ${(draftFilters.minRoc * 100).toFixed(1)}% · spread ${
    draftFilters.maxSpreadPct === null
      ? "off"
      : `≤ ${fmtPct(draftFilters.maxSpreadPct, 0)}`
  }`;

  return (
    <section className="overflow-hidden rounded-xl border border-edge bg-panel">
      <div className="flex flex-wrap items-center gap-2 border-b border-edge px-4 py-3">
        <span className="mr-1 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-3">
          Preset
        </span>
        {(Object.keys(PRESET_LABELS) as PresetName[]).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => onPreset(name)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              preset === name
                ? "border-cyan/60 bg-cyan/10 text-cyan"
                : "border-edge-2 text-ink-2 hover:border-edge-2 hover:bg-panel-2 hover:text-ink"
            }`}
          >
            {PRESET_LABELS[name]}
          </button>
        ))}
        <span className="hidden text-[11px] text-ink-3 lg:inline">
          VIX-aware defaults · Wheel targets 30–45 DTE and 0.10–0.30 |delta|
        </span>
        <div className="ml-auto flex items-center gap-2">
          <RegimeChip regime={regime} />
          <button
            type="button"
            onClick={onToggleFilters}
            aria-expanded={filtersOpen}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-edge-2 px-2.5 text-xs font-medium text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink"
          >
            <ListFilter className="h-3.5 w-3.5" />
            Filters
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="border-b border-edge px-4 py-3 sm:hidden">
        <p className="num text-[11px] leading-relaxed text-ink-2">{activeSummary}</p>
      </div>

      <div className={`${filtersOpen ? "grid" : "hidden sm:grid"} grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-4 lg:grid-cols-7`}>
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
        <NumberField
          label="Min OI"
          value={draftFilters.minOpenInterest}
          step={50}
          onChange={(value) => onUpdate({ minOpenInterest: value })}
        />
        <NumberField
          label="Max / symbol"
          value={draftFilters.maxPerSymbol}
          onChange={(value) =>
            onUpdate({ maxPerSymbol: Math.max(1, Math.round(value)) })
          }
        />
      </div>

      <div
        className={`${filtersOpen ? "flex" : "hidden sm:flex"} flex-wrap items-center gap-x-5 gap-y-3 border-t border-edge px-4 py-3 text-xs`}
      >
        <Toggle
          label="OTM only"
          checked={draftFilters.otmOnly}
          onChange={(checked) => onUpdate({ otmOnly: checked })}
        />
        <Toggle
          label="Avoid earnings"
          checked={draftFilters.avoidEarnings}
          onChange={(checked) => onUpdate({ avoidEarnings: checked })}
        />
        <Toggle
          label={`Max spread ${
            draftFilters.maxSpreadPct === null
              ? "off"
              : fmtPct(draftFilters.maxSpreadPct, 0)
          }`}
          checked={draftFilters.maxSpreadPct !== null}
          onChange={(checked) => onUpdate({ maxSpreadPct: checked ? 0.2 : null })}
        />
        {validationError ? (
          <span className="text-coral">{validationError}</span>
        ) : dirty ? (
          <span className="text-amber">Filters changed · run to apply</span>
        ) : (
          <span className="text-ink-3">Filters are applied</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-edge px-2.5 text-xs text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={!hasRows}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-edge px-2.5 text-xs text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
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
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-edge bg-panel px-3 text-left"
      >
        <ListFilter className="h-4 w-4 shrink-0 text-ink-2" />
        <span className="min-w-0">
          <span className="block text-xs font-medium text-ink">Filters</span>
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
      className={`inline-flex items-center justify-center gap-2 rounded-md bg-cyan font-semibold text-black transition-[opacity,transform] hover:opacity-90 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 ${
        mobile ? "min-w-40 px-5 text-sm" : "h-8 px-4 text-xs"
      }`}
    >
      <Play className="h-3.5 w-3.5 fill-current" />
      {scanning && !dirty ? "Scanning…" : dirty ? "Run new scan" : "Run scan"}
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
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3">
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
        className="num h-9 w-full rounded-md border border-edge bg-panel-2 px-2.5 text-sm text-ink outline-none transition-colors focus:border-cyan/70"
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
    <label className="inline-flex cursor-pointer items-center gap-2 text-ink-2">
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
      <span>{label}</span>
    </label>
  );
}
