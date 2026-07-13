"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { RotateCw } from "lucide-react";
import { MobileScanBar, ScreenerControls } from "@/components/screener-controls";
import {
  ResultsToolbar,
  ScanSummary,
  ScreenerResultsTable,
  ShortlistTray,
  type SortKey,
  type SortState,
} from "@/components/screener-results";
import { downloadCsv } from "@/lib/csv";
import { filtersFromParams, filtersToParams, isPresetName } from "@/lib/filters";
import { DEFAULT_PRESET, presetFilters, type PresetName } from "@/lib/presets";
import type {
  RegimeInfo,
  ScreenerBatchResponse,
  ScreenerFilters,
  ScreenerRow,
  Strategy,
} from "@/lib/types";

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

const DEFAULT_SORT: SortState = { key: "score", direction: "desc" };

const DEFAULT_DIRECTIONS: Record<SortKey, SortState["direction"]> = {
  score: "desc",
  annualized: "desc",
  roc: "desc",
  premium: "desc",
  dte: "asc",
  delta: "desc",
  buffer: "desc",
  oi: "desc",
  symbol: "asc",
};

function allParams(filters: ScreenerFilters): URLSearchParams {
  return new URLSearchParams({
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
}

function storageKey(strategy: Strategy) {
  return `wheeldesk:filters:${strategy}`;
}

function shortlistStorageKey(strategy: Strategy) {
  return `wheeldesk:shortlist:v1:${strategy}`;
}

function validateFilters(filters: ScreenerFilters): string | null {
  if (filters.minDte < 1 || filters.maxDte > 365 || filters.minDte > filters.maxDte) {
    return "Use a valid DTE range.";
  }
  if (
    filters.minDelta <= 0 ||
    filters.maxDelta > 1 ||
    filters.minDelta > filters.maxDelta
  ) {
    return "Use a valid delta range.";
  }
  if (filters.minRoc < 0 || filters.minOpenInterest < 0 || filters.maxPerSymbol < 1) {
    return "ROC, OI, and max per symbol cannot be negative.";
  }
  return null;
}

function compareRows(a: ScreenerRow, b: ScreenerRow, sort: SortState): number {
  let result = 0;
  switch (sort.key) {
    case "score":
      result = a.score - b.score;
      break;
    case "annualized":
      result = a.rocAnnualized - b.rocAnnualized;
      break;
    case "roc":
      result = a.roc - b.roc;
      break;
    case "premium":
      result = a.premium - b.premium;
      break;
    case "dte":
      result = a.dte - b.dte;
      break;
    case "delta":
      result = Math.abs(a.delta ?? 0) - Math.abs(b.delta ?? 0);
      break;
    case "buffer":
      result = a.otmPct - b.otmPct;
      break;
    case "oi":
      result = (a.openInterest ?? 0) - (b.openInterest ?? 0);
      break;
    case "symbol":
      result = a.symbol.localeCompare(b.symbol);
      break;
  }
  return sort.direction === "asc" ? result : -result;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export function ScreenerView({ strategy }: { strategy: Strategy }) {
  const initialFilters = useMemo(
    () => presetFilters(DEFAULT_PRESET, strategy),
    [strategy],
  );
  const [preset, setPreset] = useState<PresetName>(DEFAULT_PRESET);
  const [filters, setFilters] = useState<ScreenerFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<ScreenerFilters>(initialFilters);
  const [ready, setReady] = useState(false);
  const [regime, setRegime] = useState<RegimeInfo | null>(null);
  const [scan, setScan] = useState<ScanState>(INITIAL_SCAN);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [detailColumns, setDetailColumns] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [sector, setSector] = useState("all");
  const [shortlistOnly, setShortlistOnly] = useState(false);
  const [shortlistIds, setShortlistIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const url = new URLSearchParams(window.location.search);
    const presetParam = url.get("preset");
    let nextPreset: PresetName = DEFAULT_PRESET;
    let nextFilters = initialFilters;

    if (url.size > 0) {
      nextPreset = isPresetName(presetParam) ? presetParam : DEFAULT_PRESET;
      nextFilters = filtersFromParams(url, strategy);
    } else {
      try {
        const saved = localStorage.getItem(storageKey(strategy));
        if (saved) {
          const parsed = JSON.parse(saved) as {
            preset?: PresetName;
            filters?: ScreenerFilters;
          };
          const savedPreset = parsed.preset ?? null;
          if (isPresetName(savedPreset)) nextPreset = savedPreset;
          if (parsed.filters?.strategy === strategy) nextFilters = parsed.filters;
        }
      } catch {
        // Corrupt or disabled local storage should not block the scanner.
      }
    }

    try {
      const savedShortlist = localStorage.getItem(shortlistStorageKey(strategy));
      if (savedShortlist) {
        const parsed = JSON.parse(savedShortlist) as unknown;
        if (Array.isArray(parsed)) {
          setShortlistIds(parsed.filter((value): value is string => typeof value === "string"));
        }
      }
    } catch {
      // Shortlisting remains available for the current session.
    }

    setPreset(nextPreset);
    setFilters(nextFilters);
    setDraftFilters(nextFilters);
    setReady(true);
  }, [initialFilters, strategy]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(storageKey(strategy), JSON.stringify({ preset, filters }));
    } catch {
      // Storage is an enhancement; shareable URL state still works.
    }
    const queryString = filtersToParams(
      filters,
      preset,
      regime?.regime ?? "normal",
    ).toString();
    window.history.replaceState(
      null,
      "",
      queryString ? `?${queryString}` : window.location.pathname,
    );
  }, [filters, preset, ready, regime, strategy]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(shortlistStorageKey(strategy), JSON.stringify(shortlistIds));
    } catch {
      // Keep the in-memory shortlist when storage is unavailable.
    }
  }, [ready, shortlistIds, strategy]);

  const filterKey = useMemo(() => allParams(filters).toString(), [filters]);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    let cancelled = false;
    setScan(INITIAL_SCAN);
    setExpandedId(null);

    const fetchBatch = async (cursor: number): Promise<ScreenerBatchResponse> => {
      const params = allParams(filters);
      params.set("cursor", String(cursor));
      const response = await fetch(`/api/screener?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Screener request failed (${response.status})`);
      return (await response.json()) as ScreenerBatchResponse;
    };

    const applyBatch = (batch: ScreenerBatchResponse) => {
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

    void (async () => {
      try {
        let cursor: number | null = 0;
        while (cursor !== null && !cancelled) {
          const batch = await fetchBatch(cursor);
          applyBatch(batch);
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
    // filterKey represents the complete committed scan query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, ready, reloadNonce]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (event.key === "/" && !isEditing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === searchRef.current) {
        setQuery("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const validationError = validateFilters(draftFilters);
  const dirty = allParams(draftFilters).toString() !== filterKey;
  const scanning = ready && !scan.done && scan.error === null;

  const sectors = useMemo(
    () => Array.from(new Set(scan.rows.map((row) => row.sector))).toSorted(),
    [scan.rows],
  );
  const shortlist = useMemo(() => new Set(shortlistIds), [shortlistIds]);

  const visibleRows = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    const matching = scan.rows.filter((row) => {
      if (sector !== "all" && row.sector !== sector) return false;
      if (shortlistOnly && !shortlist.has(row.occSymbol)) return false;
      if (!normalizedQuery) return true;
      return (
        row.symbol.toLowerCase().includes(normalizedQuery) ||
        row.name.toLowerCase().includes(normalizedQuery) ||
        row.sector.toLowerCase().includes(normalizedQuery)
      );
    });
    return matching.toSorted((a, b) => compareRows(a, b, sort));
  }, [deferredQuery, scan.rows, sector, shortlist, shortlistOnly, sort]);

  const summary = useMemo(
    () => ({
      uniqueSymbols: new Set(visibleRows.map((row) => row.symbol)).size,
      medianAnnualized: median(visibleRows.map((row) => row.rocAnnualized)),
      medianBuffer: median(visibleRows.map((row) => row.otmPct)),
    }),
    [visibleRows],
  );

  const loadedShortlistRows = useMemo(() => {
    const byId = new Map(scan.rows.map((row) => [row.occSymbol, row]));
    return shortlistIds.flatMap((id) => {
      const row = byId.get(id);
      return row ? [row] : [];
    });
  }, [scan.rows, shortlistIds]);

  const applyPreset = useCallback(
    (name: PresetName) => {
      const next = presetFilters(name, strategy, regime?.regime ?? "normal");
      setPreset(name);
      setFilters(next);
      setDraftFilters(next);
      setReloadNonce((nonce) => nonce + 1);
    },
    [regime, strategy],
  );

  const updateDraft = useCallback((patch: Partial<ScreenerFilters>) => {
    setDraftFilters((current) => ({ ...current, ...patch }));
  }, []);

  const runScan = useCallback(() => {
    if (validateFilters(draftFilters)) return;
    if (dirty) setFilters(draftFilters);
    setReloadNonce((nonce) => nonce + 1);
  }, [dirty, draftFilters]);

  const resetDraft = useCallback(() => {
    setDraftFilters(presetFilters(preset, strategy, regime?.regime ?? "normal"));
  }, [preset, regime, strategy]);

  const updateSort = useCallback((key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { ...current, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: DEFAULT_DIRECTIONS[key] },
    );
  }, []);

  const toggleShortlist = useCallback((row: ScreenerRow) => {
    setShortlistIds((current) =>
      current.includes(row.occSymbol)
        ? current.filter((id) => id !== row.occSymbol)
        : [...current, row.occSymbol],
    );
  }, []);

  const title = strategy === "csp" ? "Cash-Secured Put Screener" : "Covered Call Screener";
  const description =
    strategy === "csp"
      ? "Sell puts on names you want to own — collect premium while you wait for your price."
      : "Sell calls against shares you hold — rent out upside above your basis.";
  const mobileSummary = `${draftFilters.minDte}–${draftFilters.maxDte} DTE, Δ ${draftFilters.minDelta.toFixed(2)}–${draftFilters.maxDelta.toFixed(2)}, ROC ≥ ${(draftFilters.minRoc * 100).toFixed(1)}%`;

  return (
    <div className="pb-24 pt-6 sm:pb-0">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.7rem]">{title}</h1>
          <p className="mt-1 text-sm text-ink-2">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 items-center gap-2 rounded-md border border-edge px-2.5 text-xs text-ink-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                scanning ? "animate-pulse bg-cyan" : scan.error ? "bg-coral" : "bg-teal"
              }`}
            />
            {scanning
              ? `Scanning ${scan.scanned}${scan.universeSize ? `/${scan.universeSize}` : ""}`
              : scan.error
                ? "Scan interrupted"
                : "Scan complete"}
          </span>
          <button
            type="button"
            onClick={runScan}
            disabled={validationError !== null}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-edge px-2.5 text-xs text-ink-2 transition-colors hover:bg-panel hover:text-ink disabled:opacity-40"
          >
            <RotateCw className={`h-3.5 w-3.5 ${scanning && !dirty ? "animate-spin" : ""}`} />
            {dirty ? "Run changes" : "Rescan"}
          </button>
        </div>
      </header>

      <ScreenerControls
        preset={preset}
        draftFilters={draftFilters}
        regime={regime}
        filtersOpen={filtersOpen}
        dirty={dirty}
        validationError={validationError}
        scanning={scanning}
        hasRows={visibleRows.length > 0}
        onPreset={applyPreset}
        onUpdate={updateDraft}
        onToggleFilters={() => setFiltersOpen((open) => !open)}
        onReset={resetDraft}
        onRun={runScan}
        onExport={() =>
          downloadCsv(
            visibleRows,
            `wheeldesk-${strategy}-${new Date().toISOString().slice(0, 10)}.csv`,
          )
        }
      />

      <ScanSummary
        scanned={scan.scanned}
        universeSize={scan.universeSize}
        contractCount={scan.rows.length}
        visibleCount={visibleRows.length}
        uniqueSymbols={summary.uniqueSymbols}
        medianAnnualized={summary.medianAnnualized}
        medianBuffer={summary.medianBuffer}
        asOf={asOf}
        failed={scan.failed}
        error={scan.error}
      />

      <ResultsToolbar
        query={query}
        searchRef={searchRef}
        sector={sector}
        sectors={sectors}
        shortlistOnly={shortlistOnly}
        shortlistCount={shortlistIds.length}
        detailColumns={detailColumns}
        onQuery={setQuery}
        onSector={setSector}
        onShortlistOnly={setShortlistOnly}
        onDetailColumns={setDetailColumns}
      />
      <ScreenerResultsTable
        rows={visibleRows}
        done={scan.done}
        sort={sort}
        detailColumns={detailColumns}
        expandedId={expandedId}
        shortlist={shortlist}
        onSort={updateSort}
        onExpand={(id) => setExpandedId((current) => (current === id ? null : id))}
        onToggleShortlist={toggleShortlist}
      />
      <ShortlistTray
        rows={loadedShortlistRows}
        total={shortlistIds.length}
        onRemove={toggleShortlist}
        onClear={() => {
          setShortlistIds([]);
          setShortlistOnly(false);
        }}
      />

      <MobileScanBar
        summary={mobileSummary}
        scanning={scanning}
        dirty={dirty}
        disabled={validationError !== null}
        onFilters={() => {
          setFiltersOpen(true);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onRun={runScan}
      />
    </div>
  );
}
