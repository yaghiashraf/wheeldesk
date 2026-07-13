"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { RotateCw, ShieldCheck } from "lucide-react";
import { MobileScanBar, ScreenerControls } from "@/components/screener-controls";
import {
  ResultsToolbar,
  ResearchPipeline,
  ScanSummary,
  ScreenerResultsTable,
  ShortlistTray,
  type SortKey,
  type SortState,
} from "@/components/screener-results";
import { downloadCsv } from "@/lib/csv";
import { defaultFilters } from "@/lib/defaults";
import { filtersFromParams, filtersToParams } from "@/lib/filters";
import { rankResearchRows, type ResearchRow } from "@/lib/research";
import type {
  RegimeInfo,
  ScreenerBatchResponse,
  ScreenerFilters,
  FundamentalPeerSnapshot,
  ScreenerRow,
  Strategy,
} from "@/lib/types";

type ScanState = {
  rows: ScreenerRow[];
  fundamentalUniverse: FundamentalPeerSnapshot[];
  attemptedSymbols: string[];
  loadedSymbols: string[];
  universeSize: number | null;
  failed: string[];
  retrying: boolean;
  done: boolean;
  error: string | null;
};

const INITIAL_SCAN: ScanState = {
  rows: [],
  fundamentalUniverse: [],
  attemptedSymbols: [],
  loadedSymbols: [],
  universeSize: null,
  failed: [],
  retrying: false,
  done: false,
  error: null,
};

type StatusScope = "all" | "actionable" | "gated" | "data-gaps";

const DEFAULT_SORT: SortState = { key: "underwrite", direction: "desc" };
const SCAN_BATCH_SIZE = 4;
const TRANSIENT_BATCH_STATUSES = new Set([429, 502, 503, 504]);

const DEFAULT_DIRECTIONS: Record<SortKey, SortState["direction"]> = {
  underwrite: "desc",
  valuation: "desc",
  quality: "desc",
  volEdge: "desc",
  execution: "desc",
  annualized: "desc",
  buffer: "desc",
  spread: "asc",
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
    maxValuation: String(filters.maxValuationPercentile),
    minQuality: String(filters.minQualityScore),
    minMoveCoverage: String(filters.minExpectedMoveCoverage),
    stocksOnly: filters.stocksOnly ? "1" : "0",
  });
}

function storageKey(strategy: Strategy) {
  return `wheeldesk:filters:v3:${strategy}`;
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
  if (filters.minExpectedMoveCoverage < 0 || filters.minExpectedMoveCoverage > 3) {
    return "Expected-move coverage must be between 0× and 3×.";
  }
  return null;
}

function compareNullable(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return -1;
  if (b === null) return 1;
  return a - b;
}

function compareRows(a: ResearchRow, b: ResearchRow, sort: SortState): number {
  let result = 0;
  switch (sort.key) {
    case "underwrite":
      result =
        ({ "DATA GAP": 0, GATED: 1, REVIEW: 2, ADVANCE: 3 }[a.research.status] -
          { "DATA GAP": 0, GATED: 1, REVIEW: 2, ADVANCE: 3 }[b.research.status]) ||
        compareNullable(a.research.underwriteScore, b.research.underwriteScore);
      break;
    case "valuation":
      result = compareNullable(
        a.research.valuationScore,
        b.research.valuationScore,
      );
      break;
    case "quality":
      result = compareNullable(a.research.qualityScore, b.research.qualityScore);
      break;
    case "volEdge":
      result = a.research.volEdgeScore - b.research.volEdgeScore;
      break;
    case "execution":
      result = a.research.executionScore - b.research.executionScore;
      break;
    case "annualized":
      result = a.rocAnnualized - b.rocAnnualized;
      break;
    case "buffer":
      result = compareNullable(
        a.research.expectedMoveCoverage,
        b.research.expectedMoveCoverage,
      );
      break;
    case "spread":
      result = compareNullable(a.spreadPct, b.spreadPct);
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
  const initialFilters = useMemo(() => defaultFilters(strategy), [strategy]);
  const [filters, setFilters] = useState<ScreenerFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<ScreenerFilters>(initialFilters);
  const [ready, setReady] = useState(false);
  const [regime, setRegime] = useState<RegimeInfo | null>(null);
  const [regimeLoading, setRegimeLoading] = useState(true);
  const [scan, setScan] = useState<ScanState>(INITIAL_SCAN);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [detailColumns, setDetailColumns] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [runRequested, setRunRequested] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [sector, setSector] = useState("all");
  const [statusScope, setStatusScope] = useState<StatusScope>("all");
  const [shortlistOnly, setShortlistOnly] = useState(false);
  const [shortlistIds, setShortlistIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/regime", { signal: controller.signal });
        if (!response.ok) return;
        setRegime((await response.json()) as RegimeInfo);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      } finally {
        if (!controller.signal.aborted) setRegimeLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const url = new URLSearchParams(window.location.search);
    let nextFilters = initialFilters;

    if (url.size > 0) {
      nextFilters = filtersFromParams(url, strategy);
    } else {
      try {
        const saved = localStorage.getItem(storageKey(strategy));
        if (saved) {
          const parsed = JSON.parse(saved) as { filters?: ScreenerFilters };
          if (parsed.filters?.strategy === strategy) {
            // Migrate the former 0.6% starting floor without discarding the
            // user's other saved mandate edits. Explicit URL values still win.
            nextFilters =
              parsed.filters.minRoc === 0.006
                ? { ...parsed.filters, minRoc: initialFilters.minRoc }
                : parsed.filters;
          }
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

    setFilters(nextFilters);
    setDraftFilters(nextFilters);
    setReady(true);
  }, [initialFilters, strategy]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(storageKey(strategy), JSON.stringify({ filters }));
    } catch {
      // Storage is an enhancement; shareable URL state still works.
    }
    const queryString = filtersToParams(filters).toString();
    window.history.replaceState(
      null,
      "",
      queryString ? `?${queryString}` : window.location.pathname,
    );
  }, [filters, ready, strategy]);

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
    if (!ready || !runRequested) return;
    const controller = new AbortController();
    let cancelled = false;
    setScan(INITIAL_SCAN);
    setExpandedId(null);

    const fetchBatch = async (
      cursor: number,
      symbols?: string[],
    ): Promise<ScreenerBatchResponse> => {
      const params = allParams(filters);
      if (symbols?.length) params.set("symbols", symbols.join(","));
      else params.set("cursor", String(cursor));
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await fetch(`/api/screener?${params.toString()}`, {
          signal: controller.signal,
        });
        if (response.ok) return (await response.json()) as ScreenerBatchResponse;
        if (!TRANSIENT_BATCH_STATUSES.has(response.status) || attempt === 1) {
          throw new Error(`Screener request failed (${response.status})`);
        }
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
      }
      throw new Error("Screener request failed after retry");
    };

    const applyBatch = (batch: ScreenerBatchResponse) => {
      if (cancelled) return;
      const batchFailed = new Set(batch.failed);
      const batchLoaded = batch.scanned.filter((symbol) => !batchFailed.has(symbol));
      setRegime((current) => batch.regime ?? current);
      setAsOf(batch.asOf);
      setScan((current) => ({
        ...current,
        rows: [
          ...new Map(
            [...current.rows, ...batch.rows].map((row) => [row.occSymbol, row]),
          ).values(),
        ],
        fundamentalUniverse: [
          ...new Map(
            [...current.fundamentalUniverse, ...batch.fundamentalUniverse].map((peer) => [
              peer.symbol,
              peer,
            ]),
          ).values(),
        ],
        attemptedSymbols: [...new Set([...current.attemptedSymbols, ...batch.scanned])],
        loadedSymbols: [...new Set([...current.loadedSymbols, ...batchLoaded])],
        failed: [
          ...new Set([
            ...current.failed.filter((symbol) => !batchLoaded.includes(symbol)),
            ...batch.failed,
          ]),
        ],
        universeSize: batch.universeSize,
      }));
    };

    void (async () => {
      try {
        const failedSymbols = new Set<string>();
        let cursor: number | null = 0;
        while (cursor !== null && !cancelled) {
          const batch = await fetchBatch(cursor);
          applyBatch(batch);
          batch.scanned.forEach((symbol) => {
            if (batch.failed.includes(symbol)) failedSymbols.add(symbol);
            else failedSymbols.delete(symbol);
          });
          cursor = batch.nextCursor;
        }

        if (!cancelled && failedSymbols.size > 0) {
          setScan((current) => ({ ...current, retrying: true }));
          const retrySymbols = [...failedSymbols];
          for (
            let index = 0;
            index < retrySymbols.length && !cancelled;
            index += SCAN_BATCH_SIZE
          ) {
            try {
              const batch = await fetchBatch(
                0,
                retrySymbols.slice(index, index + SCAN_BATCH_SIZE),
              );
              applyBatch(batch);
            } catch (error) {
              if (error instanceof DOMException && error.name === "AbortError") throw error;
              // Preserve the original failed-symbol set. A retry outage should
              // not discard an otherwise complete partial scan.
            }
          }
        }

        if (!cancelled) {
          setScan((current) => ({ ...current, done: true, retrying: false }));
        }
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
  }, [filterKey, ready, reloadNonce, runRequested]);

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
  const scanning = ready && runRequested && !scan.done && scan.error === null;

  const sectors = useMemo(
    () => Array.from(new Set(scan.rows.map((row) => row.sector))).toSorted(),
    [scan.rows],
  );
  const shortlist = useMemo(() => new Set(shortlistIds), [shortlistIds]);
  const researchRows = useMemo(
    () => rankResearchRows(scan.rows, scan.fundamentalUniverse, filters),
    [filters, scan.fundamentalUniverse, scan.rows],
  );

  const visibleRows = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    const matching = researchRows.filter((row) => {
      if (sector !== "all" && row.sector !== sector) return false;
      if (shortlistOnly && !shortlist.has(row.occSymbol)) return false;
      if (filters.stocksOnly && row.kind === "etf") return false;
      if (
        statusScope === "actionable" &&
        row.research.status !== "ADVANCE" &&
        row.research.status !== "REVIEW"
      ) return false;
      if (statusScope === "gated" && row.research.status !== "GATED") return false;
      if (statusScope === "data-gaps" && row.research.status !== "DATA GAP") return false;
      if (!normalizedQuery) return true;
      return (
        row.symbol.toLowerCase().includes(normalizedQuery) ||
        row.name.toLowerCase().includes(normalizedQuery) ||
        row.sector.toLowerCase().includes(normalizedQuery)
      );
    });
    return matching.toSorted((a, b) => compareRows(a, b, sort));
  }, [
    deferredQuery,
    filters.stocksOnly,
    researchRows,
    sector,
    shortlist,
    shortlistOnly,
    sort,
    statusScope,
  ]);

  const summary = useMemo(
    () => {
      const bySymbol = new Map(researchRows.map((row) => [row.symbol, row]));
      const stocks = [...bySymbol.values()].filter((row) => row.kind === "stock");
      const covered = stocks.filter(
        (row) => row.fundamentals.source !== "unavailable" && row.fundamentals.coverage > 0,
      );
      return {
        fundamentalCoverage: stocks.length === 0 ? 0 : covered.length / stocks.length,
        medianIvRv: median(
          [...bySymbol.values()].flatMap((row) =>
            row.ivRv === null ? [] : [row.ivRv],
          ),
        ),
        dataGaps: new Set(
          researchRows
            .filter((row) => row.research.underwriteScore === null)
            .map((row) => row.symbol),
        ).size,
        contractSymbols: bySymbol.size,
        contractRows: researchRows.length,
        qualified: new Set(
          researchRows
            .filter(
              (row) =>
                row.research.status === "ADVANCE" || row.research.status === "REVIEW",
            )
            .map((row) => row.symbol),
        ).size,
        gated: new Set(
          researchRows
            .filter((row) => row.research.status === "GATED")
            .map((row) => row.symbol),
        ).size,
      };
    },
    [researchRows],
  );

  const loadedShortlistRows = useMemo(() => {
    const byId = new Map(researchRows.map((row) => [row.occSymbol, row]));
    return shortlistIds.flatMap((id) => {
      const row = byId.get(id);
      return row ? [row] : [];
    });
  }, [researchRows, shortlistIds]);

  const updateDraft = useCallback((patch: Partial<ScreenerFilters>) => {
    setDraftFilters((current) => ({ ...current, ...patch }));
  }, []);

  const runScan = useCallback(() => {
    if (validateFilters(draftFilters)) return;
    setRunRequested(true);
    if (dirty) setFilters(draftFilters);
    setReloadNonce((nonce) => nonce + 1);
  }, [dirty, draftFilters]);

  const resetDraft = useCallback(() => {
    setDraftFilters(defaultFilters(strategy));
  }, [strategy]);

  const updateSort = useCallback((key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { ...current, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: DEFAULT_DIRECTIONS[key] },
    );
  }, []);

  const toggleShortlist = useCallback((row: ResearchRow) => {
    setShortlistIds((current) =>
      current.includes(row.occSymbol)
        ? current.filter((id) => id !== row.occSymbol)
        : [...current, row.occSymbol],
    );
  }, []);

  const title = strategy === "csp" ? "Cash-Secured Put Underwriter" : "Covered Call Underwriter";
  const description =
    strategy === "csp"
      ? "Rank assignment quality, relative valuation, volatility edge, and execution—not yield in isolation."
      : "Rank call overwrites across volatility edge, execution, event risk, and capital efficiency.";
  const mobileSummary = `${draftFilters.minDte}–${draftFilters.maxDte} DTE · Δ ${draftFilters.minDelta.toFixed(2)}–${draftFilters.maxDelta.toFixed(2)} · buffer ≥ ${draftFilters.minExpectedMoveCoverage.toFixed(2)}× move`;

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
              ? "Research mode"
              : scan.error
                ? "Scan interrupted"
                : runRequested
                  ? "Data freeze"
                  : "Awaiting scan"}
          </span>
          <button
            type="button"
            onClick={runScan}
            disabled={validationError !== null}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-edge px-2.5 text-xs text-ink-2 transition-colors hover:bg-panel hover:text-ink disabled:opacity-40"
          >
            <RotateCw className={`h-3.5 w-3.5 ${scanning && !dirty ? "animate-spin" : ""}`} />
            {!runRequested ? "Run scan" : dirty ? "Run changes" : "Rescan"}
          </button>
        </div>
      </header>

      <ScreenerControls
        draftFilters={draftFilters}
        regime={regime}
        regimeLoading={regimeLoading}
        filtersOpen={filtersOpen}
        dirty={dirty}
        validationError={validationError}
        scanning={scanning}
        hasRows={visibleRows.length > 0}
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

      {!runRequested ? (
        <section className="mt-3 flex min-h-52 items-center justify-center rounded-lg border border-dashed border-edge-2 bg-panel/55 px-6 py-10 text-center">
          <div className="max-w-lg">
            <ShieldCheck className="mx-auto h-6 w-6 text-cyan" strokeWidth={1.5} aria-hidden />
            <h2 className="mt-4 text-sm font-semibold text-ink">Mandate ready. Scanner idle.</h2>
            <p className="mt-2 text-xs leading-relaxed text-ink-2">
              Review the contract, assignment, execution, and event constraints above.
              No universe or options-chain scan will run until you click Run scan.
            </p>
            <button
              type="button"
              onClick={runScan}
              disabled={validationError !== null}
              className="mt-5 inline-flex h-9 items-center justify-center rounded bg-cyan px-5 text-xs font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Run scan
            </button>
          </div>
        </section>
      ) : (
        <>
          <ResearchPipeline
            attempted={scan.attemptedSymbols.length}
            loaded={scan.loadedSymbols.length}
            universeSize={scan.universeSize}
            contractSymbols={summary.contractSymbols}
            contractRows={summary.contractRows}
            qualified={summary.qualified}
            gated={summary.gated}
            dataGaps={summary.dataGaps}
            retrying={scan.retrying}
            done={scan.done}
          />

          <ScanSummary
            qualified={summary.qualified}
            gated={summary.gated}
            contractSymbols={summary.contractSymbols}
            contractRows={summary.contractRows}
            attempted={scan.attemptedSymbols.length}
            loaded={scan.loadedSymbols.length}
            universeSize={scan.universeSize}
            fundamentalCoverage={summary.fundamentalCoverage}
            medianIvRv={summary.medianIvRv}
            dataGaps={summary.dataGaps}
            asOf={asOf}
            failed={scan.failed}
            error={scan.error}
          />

          <ResultsToolbar
            query={query}
            searchRef={searchRef}
            sector={sector}
            sectors={sectors}
            statusScope={statusScope}
            shortlistOnly={shortlistOnly}
            shortlistCount={shortlistIds.length}
            detailColumns={detailColumns}
            onQuery={setQuery}
            onSector={setSector}
            onStatusScope={setStatusScope}
            onShortlistOnly={setShortlistOnly}
            onDetailColumns={setDetailColumns}
          />
          <ScreenerResultsTable
            rows={visibleRows}
            done={scan.done}
            emptyMessage={
              statusScope === "all"
                ? "No contract rows match the current search, sector, shortlist, or stock-only view. Clear table filters or widen a hard contract gate."
                : "No rows match this research-status view. Switch to All mandate survivors to inspect the complete contract set."
            }
            sort={sort}
            detailColumns={detailColumns}
            expandedId={expandedId}
            shortlist={shortlist}
            onSort={updateSort}
            onExpand={(id) => setExpandedId((current) => (current === id ? null : id))}
            onToggleShortlist={toggleShortlist}
          />
        </>
      )}
      <ShortlistTray
        rows={loadedShortlistRows}
        total={shortlistIds.length}
        onRemove={toggleShortlist}
        onClear={() => {
          setShortlistIds([]);
          setShortlistOnly(false);
        }}
      />

      {!filtersOpen ? (
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
      ) : null}
    </div>
  );
}
