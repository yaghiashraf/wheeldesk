"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarClock, Coins, Download, RotateCw } from "lucide-react";
import { RegimeChip } from "@/components/regime-chip";
import { ScoreBadge } from "@/components/score-badge";
import { downloadCsv } from "@/lib/csv";
import { filtersToParams, isPresetName } from "@/lib/filters";
import { fmtDate, fmtDateTime, fmtDelta, fmtMoney, fmtNum, fmtPct } from "@/lib/format";
import { DEFAULT_PRESET, PRESET_LABELS, presetFilters, type PresetName } from "@/lib/presets";
import type {
  RegimeInfo,
  ScreenerBatchResponse,
  ScreenerFilters,
  ScreenerRow,
  Strategy,
} from "@/lib/types";

const SORTS = {
  score: (a: ScreenerRow, b: ScreenerRow) => b.score - a.score,
  annualized: (a: ScreenerRow, b: ScreenerRow) => b.rocAnnualized - a.rocAnnualized,
  roc: (a: ScreenerRow, b: ScreenerRow) => b.roc - a.roc,
  premium: (a: ScreenerRow, b: ScreenerRow) => b.premium - a.premium,
  dte: (a: ScreenerRow, b: ScreenerRow) => a.dte - b.dte,
  delta: (a: ScreenerRow, b: ScreenerRow) =>
    Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0),
  buffer: (a: ScreenerRow, b: ScreenerRow) => b.otmPct - a.otmPct,
  oi: (a: ScreenerRow, b: ScreenerRow) => (b.openInterest ?? 0) - (a.openInterest ?? 0),
  symbol: (a: ScreenerRow, b: ScreenerRow) => a.symbol.localeCompare(b.symbol),
} as const;

type SortKey = keyof typeof SORTS;

function allParams(filters: ScreenerFilters): URLSearchParams {
  const params = new URLSearchParams({
    strategy: filters.strategy,
    minDte: String(filters.minDte),
    maxDte: String(filters.maxDte),
    minDelta: String(filters.minDelta),
    maxDelta: String(filters.maxDelta),
    minRoc: String(filters.minRoc),
    minOi: String(filters.minOpenInterest),
    maxSpread: filters.maxSpreadPct === null ? "off" : String(filters.maxSpreadPct),
    otm: filters.otmOnly ? "1" : "0",
    avoidEarnings: filters.avoidEarnings ? "1" : "0",
    maxPerSymbol: String(filters.maxPerSymbol),
  });
  return params;
}

function storageKey(strategy: Strategy) {
  return `wheeldesk:filters:${strategy}`;
}

type ScanState = {
  rows: ScreenerRow[];
  scanned: number;
  universeSize: number | null;
  failed: string[];
  done: boolean;
  error: string | null;
};

const INITIAL_SCAN: ScanState = {
  rows: [],
  scanned: 0,
  universeSize: null,
  failed: [],
  done: false,
  error: null,
};

export function ScreenerView({ strategy }: { strategy: Strategy }) {
  const [preset, setPreset] = useState<PresetName>(DEFAULT_PRESET);
  const [filters, setFilters] = useState<ScreenerFilters>(() =>
    presetFilters(DEFAULT_PRESET, strategy),
  );
  const [regime, setRegime] = useState<RegimeInfo | null>(null);
  const [scan, setScan] = useState<ScanState>(INITIAL_SCAN);
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [detailColumns, setDetailColumns] = useState(false);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const hydrated = useRef(false);

  // Initial filters: URL params win, then last-used from localStorage.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const url = new URLSearchParams(window.location.search);
    const presetParam = url.get("preset");
    if (url.size > 0) {
      const initialPreset = isPresetName(presetParam) ? presetParam : DEFAULT_PRESET;
      setPreset(initialPreset);
      setFilters((current) => {
        const base = presetFilters(initialPreset, strategy);
        const read = (key: string) => url.get(key);
        const readNum = (key: string, fallback: number) => {
          const value = Number(read(key));
          return read(key) !== null && Number.isFinite(value) ? value : fallback;
        };
        void current;
        return {
          ...base,
          minDte: readNum("minDte", base.minDte),
          maxDte: readNum("maxDte", base.maxDte),
          minDelta: readNum("minDelta", base.minDelta),
          maxDelta: readNum("maxDelta", base.maxDelta),
          minRoc: readNum("minRoc", base.minRoc),
          minOpenInterest: readNum("minOi", base.minOpenInterest),
          maxSpreadPct:
            read("maxSpread") === "off"
              ? null
              : readNum("maxSpread", base.maxSpreadPct ?? 0.2),
          otmOnly: read("otm") !== null ? read("otm") === "1" : base.otmOnly,
          avoidEarnings:
            read("avoidEarnings") !== null
              ? read("avoidEarnings") === "1"
              : base.avoidEarnings,
          maxPerSymbol: readNum("maxPerSymbol", base.maxPerSymbol),
        };
      });
      return;
    }
    try {
      const saved = localStorage.getItem(storageKey(strategy));
      if (saved) {
        const parsed = JSON.parse(saved) as { preset: PresetName; filters: ScreenerFilters };
        if (isPresetName(parsed.preset)) setPreset(parsed.preset);
        if (parsed.filters?.strategy === strategy) setFilters(parsed.filters);
      }
    } catch {
      // Ignore corrupt saved state.
    }
  }, [strategy]);

  // Persist filters and keep the URL shareable.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(storageKey(strategy), JSON.stringify({ preset, filters }));
    } catch {
      // Storage may be unavailable; the screener still works.
    }
    const query = filtersToParams(filters, preset, regime?.regime ?? "normal").toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, [filters, preset, strategy, regime]);

  // Progressive universe scan, one cursor batch at a time.
  const filterKey = useMemo(() => allParams(filters).toString(), [filters]);
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setScan(INITIAL_SCAN);

    const fetchBatch = async (cursor: number): Promise<ScreenerBatchResponse> => {
      const params = allParams(filters);
      params.set("cursor", String(cursor));
      const response = await fetch(`/api/screener?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Screener request failed (${response.status})`);
      return (await response.json()) as ScreenerBatchResponse;
    };

    const apply = (batch: ScreenerBatchResponse) => {
      if (cancelled) return;
      setRegime((current) => batch.regime ?? current);
      setAsOf(batch.asOf);
      setScan((current) => ({
        ...current,
        rows: [...current.rows, ...batch.rows],
        scanned: current.scanned + batch.scanned.length,
        failed: [...current.failed, ...batch.failed],
        universeSize: batch.universeSize,
      }));
    };

    (async () => {
      try {
        // Batches run sequentially: the chain vendor rate-limits bursts, so
        // the server paces itself and the client must not multiply the load.
        let cursor: number | null = 0;
        while (cursor !== null && !cancelled) {
          const batch = await fetchBatch(cursor);
          apply(batch);
          cursor = batch.nextCursor;
        }
        if (!cancelled) setScan((current) => ({ ...current, done: true }));
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === "AbortError")) {
          setScan((current) => ({
            ...current,
            done: true,
            error: error instanceof Error ? error.message : "Scan failed",
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // filterKey encodes every filter value; reloadNonce forces a rescan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, reloadNonce]);

  const sortedRows = useMemo(
    () => [...scan.rows].sort(SORTS[sortKey]),
    [scan.rows, sortKey],
  );

  const applyPreset = useCallback(
    (name: PresetName) => {
      setPreset(name);
      setFilters(presetFilters(name, strategy, regime?.regime ?? "normal"));
    },
    [strategy, regime],
  );

  const update = useCallback((patch: Partial<ScreenerFilters>) => {
    setFilters((current) => ({ ...current, ...patch }));
  }, []);

  const title = strategy === "csp" ? "Cash-Secured Put Screener" : "Covered Call Screener";
  const progress =
    scan.universeSize && scan.universeSize > 0 ? scan.scanned / scan.universeSize : 0;

  return (
    <div className="py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-ink-2">
            {strategy === "csp"
              ? "Sell puts on names you want to own — collect premium while you wait for your price."
              : "Sell calls against shares you hold — rent out upside above your basis."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RegimeChip regime={regime} />
          <button
            type="button"
            onClick={() => setReloadNonce((nonce) => nonce + 1)}
            className="inline-flex items-center gap-1.5 rounded-md border border-edge px-2.5 py-1 text-xs text-ink-2 hover:bg-panel-2 hover:text-ink"
            title="Re-run the scan"
          >
            <RotateCw className={`h-3.5 w-3.5 ${scan.done ? "" : "animate-spin"}`} />
            {scan.done ? "Rescan" : "Scanning"}
          </button>
        </div>
      </div>

      {/* Presets + filters */}
      <div className="mt-6 rounded-xl border border-edge bg-panel p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-ink-3">Preset</span>
          {(Object.keys(PRESET_LABELS) as PresetName[]).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => applyPreset(name)}
              className={`rounded-md border px-3 py-1 text-xs transition-colors ${
                preset === name
                  ? "border-cyan/50 bg-cyan/10 text-cyan"
                  : "border-edge text-ink-2 hover:bg-panel-2 hover:text-ink"
              }`}
            >
              {PRESET_LABELS[name]}
            </button>
          ))}
          <span className="text-[11px] text-ink-3">
            auto-tuned to the VIX regime · Wheel = 30–45 DTE, 0.10–0.30 Δ
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <NumberField
            label="Min DTE"
            value={filters.minDte}
            onChange={(value) => update({ minDte: value })}
          />
          <NumberField
            label="Max DTE"
            value={filters.maxDte}
            onChange={(value) => update({ maxDte: value })}
          />
          <NumberField
            label="Min |Δ|"
            value={filters.minDelta}
            step={0.01}
            onChange={(value) => update({ minDelta: value })}
          />
          <NumberField
            label="Max |Δ|"
            value={filters.maxDelta}
            step={0.01}
            onChange={(value) => update({ maxDelta: value })}
          />
          <NumberField
            label="Min ROC %"
            value={Number((filters.minRoc * 100).toFixed(2))}
            step={0.1}
            onChange={(value) => update({ minRoc: value / 100 })}
          />
          <NumberField
            label="Min OI"
            value={filters.minOpenInterest}
            step={50}
            onChange={(value) => update({ minOpenInterest: value })}
          />
          <NumberField
            label="Max/symbol"
            value={filters.maxPerSymbol}
            onChange={(value) => update({ maxPerSymbol: Math.max(1, Math.round(value)) })}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
          <Toggle
            label="OTM only"
            checked={filters.otmOnly}
            onChange={(checked) => update({ otmOnly: checked })}
          />
          <Toggle
            label="Avoid earnings in window"
            checked={filters.avoidEarnings}
            onChange={(checked) => update({ avoidEarnings: checked })}
          />
          <Toggle
            label={`Max spread ${filters.maxSpreadPct === null ? "(off)" : fmtPct(filters.maxSpreadPct, 0)}`}
            checked={filters.maxSpreadPct !== null}
            onChange={(checked) => update({ maxSpreadPct: checked ? 0.2 : null })}
          />
          <Toggle
            label="Detail columns"
            checked={detailColumns}
            onChange={setDetailColumns}
          />
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                sortedRows,
                `wheeldesk-${strategy}-${new Date().toISOString().slice(0, 10)}.csv`,
              )
            }
            disabled={sortedRows.length === 0}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-edge px-2.5 py-1 text-xs text-ink-2 hover:bg-panel-2 hover:text-ink disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
      </div>

      {/* Scan progress */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ink-2">
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-panel-2">
          <div
            className="h-full rounded-full bg-cyan transition-[width] duration-300"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        <span className="num">
          {scan.scanned}
          {scan.universeSize ? `/${scan.universeSize}` : ""} symbols scanned ·{" "}
          {sortedRows.length} contracts
        </span>
        {asOf && <span className="text-ink-3">as of {fmtDateTime(asOf)}</span>}
        {scan.failed.length > 0 && (
          <span className="text-amber" title={scan.failed.join(", ")}>
            {scan.failed.length} symbols unavailable
          </span>
        )}
        {scan.error && <span className="text-coral">{scan.error}</span>}
      </div>

      {/* Results */}
      <div className="scroller mt-4 overflow-x-auto rounded-xl border border-edge">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-edge bg-panel text-left text-[11px] uppercase tracking-wider text-ink-3">
              <Th
                sticky
                label="Ticker"
                sortKey="symbol"
                current={sortKey}
                onSort={setSortKey}
              />
              <Th label="Score" sortKey="score" current={sortKey} onSort={setSortKey} />
              <Th label="Spot" />
              <Th label="Strike" />
              <Th label="Exp / DTE" sortKey="dte" current={sortKey} onSort={setSortKey} />
              <Th label="|Δ|" sortKey="delta" current={sortKey} onSort={setSortKey} />
              <Th label="Premium" sortKey="premium" current={sortKey} onSort={setSortKey} />
              <Th label="ROC" sortKey="roc" current={sortKey} onSort={setSortKey} />
              <Th
                label="Annualized"
                sortKey="annualized"
                current={sortKey}
                onSort={setSortKey}
              />
              <Th label="Buffer" sortKey="buffer" current={sortKey} onSort={setSortKey} />
              <Th label="P(ITM)" />
              {detailColumns && (
                <>
                  <Th label="IV" />
                  <Th label="IV/RV" />
                  <Th label="Spread" />
                  <Th label="Breakeven" />
                </>
              )}
              <Th label="OI" sortKey="oi" current={sortKey} onSort={setSortKey} />
              <Th label="Events" />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr
                key={row.occSymbol}
                className="border-b border-edge/60 transition-colors hover:bg-panel-2"
              >
                <td className="sticky left-0 z-10 bg-desk px-3 py-2">
                  <Link href={`/ticker/${row.symbol}`} className="group block">
                    <span className="font-semibold text-cyan group-hover:underline">
                      {row.symbol}
                    </span>
                    <span className="block max-w-[9rem] truncate text-[11px] text-ink-3">
                      {row.name}
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <ScoreBadge score={row.score} parts={row.scoreParts} />
                </td>
                <td className="num px-3 py-2">{fmtMoney(row.spot)}</td>
                <td className="num px-3 py-2 font-medium">{fmtMoney(row.strike)}</td>
                <td className="px-3 py-2">
                  <span className="num">{fmtDate(row.expiration)}</span>
                  <span className="num ml-1.5 text-[11px] text-ink-3">{row.dte}d</span>
                </td>
                <td className="num px-3 py-2">{fmtDelta(row.delta)}</td>
                <td className="px-3 py-2">
                  <span className="num font-medium text-teal">{fmtMoney(row.premium, 0)}</span>
                  <span className="num ml-1.5 text-[11px] text-ink-3">
                    {fmtMoney(row.mid)}
                  </span>
                </td>
                <td className="num px-3 py-2">{fmtPct(row.roc)}</td>
                <td className="num px-3 py-2 font-medium">{fmtPct(row.rocAnnualized)}</td>
                <td className="num px-3 py-2">{fmtPct(row.otmPct)}</td>
                <td className="num px-3 py-2">{fmtPct(row.pItm, 0)}</td>
                {detailColumns && (
                  <>
                    <td className="num px-3 py-2">{fmtPct(row.iv, 0)}</td>
                    <td className="num px-3 py-2">{row.ivRv?.toFixed(2) ?? "—"}</td>
                    <td className="num px-3 py-2">{fmtPct(row.spreadPct, 0)}</td>
                    <td className="num px-3 py-2">{fmtMoney(row.breakeven)}</td>
                  </>
                )}
                <td className="num px-3 py-2">{fmtNum(row.openInterest)}</td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-1.5">
                    {row.earningsDate && (
                      <span title={`Earnings ${row.earningsDate} — inside this trade's window`}>
                        <CalendarClock className="h-4 w-4 text-amber" />
                      </span>
                    )}
                    {row.exDivDate && (
                      <span title={`Ex-dividend ${row.exDivDate} — inside this trade's window`}>
                        <Coins className="h-4 w-4 text-teal" />
                      </span>
                    )}
                    {!row.earningsDate && !row.exDivDate && (
                      <span className="text-ink-3">—</span>
                    )}
                  </span>
                </td>
              </tr>
            ))}
            {sortedRows.length === 0 && (
              <tr>
                <td colSpan={17} className="px-4 py-12 text-center text-sm text-ink-3">
                  {scan.done
                    ? "No contracts match these filters. Widen the delta band or lower the minimum ROC."
                    : "Scanning the universe…"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  label,
  sortKey,
  current,
  onSort,
  sticky,
}: {
  label: string;
  sortKey?: SortKey;
  current?: SortKey;
  onSort?: (key: SortKey) => void;
  sticky?: boolean;
}) {
  const active = sortKey && sortKey === current;
  return (
    <th
      className={`px-3 py-2.5 font-medium ${sticky ? "sticky left-0 z-10 bg-panel" : ""}`}
    >
      {sortKey && onSort ? (
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className={`inline-flex items-center gap-1 uppercase tracking-wider ${
            active ? "text-cyan" : "hover:text-ink"
          }`}
        >
          {label}
          {active && <span aria-hidden>▾</span>}
        </button>
      ) : (
        label
      )}
    </th>
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
      <span className="mb-1 block text-[11px] uppercase tracking-wider text-ink-3">
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
        className="num w-full rounded-md border border-edge bg-panel-2 px-2 py-1.5 text-sm text-ink outline-none focus:border-cyan/60"
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
        className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
          checked ? "bg-cyan/70" : "bg-edge-2"
        }`}
      >
        <span
          className={`absolute left-0.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-ink transition-transform ${
            checked ? "translate-x-3" : "translate-x-0"
          }`}
        />
      </button>
      <span>{label}</span>
    </label>
  );
}
