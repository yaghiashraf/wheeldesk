"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ShieldCheck } from "lucide-react";
import { MobileScanBar, ScreenerControls } from "@/components/screener-controls";
import {
  TieredScannerWorkspace,
  type StatusScope,
} from "@/components/tiered-scanner-workspace";
import {
  ScanStatus,
  type SortKey,
  type SortState,
} from "@/components/screener-results";
import { downloadCsv } from "@/lib/csv";
import { defaultFilters } from "@/lib/defaults";
import { filtersFromParams, filtersToParams } from "@/lib/filters";
import { fmtDateTime } from "@/lib/format";
import { rankResearchRows, type ResearchRow } from "@/lib/research";
import { isTierBlocked } from "@/lib/research-presentation";
import { SCAN_SCOPE_LABEL } from "@/lib/universe";
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

const DEFAULT_SORT: SortState = { key: "underwrite", direction: "desc" };
const SCAN_BATCH_SIZE = 4;
const TRANSIENT_BATCH_STATUSES = new Set([429, 502, 503, 504]);

const DEFAULT_DIRECTIONS: Record<SortKey, SortState["direction"]> = {
  underwrite: "desc",
  valuation: "desc",
  quality: "desc",
  volEdge: "desc",
  execution: "desc",
  premium: "desc",
  roi: "desc",
  drawdown: "desc",
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
    scope: filters.scope,
  });
}

function storageKey(strategy: Strategy) {
  // v5 introduces the named scan presets and a wider 1% balanced ROI floor.
  // Saved filters shadow defaults entirely, so the version bump is required.
  return `wheeldesk:filters:v5:${strategy}`;
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

/** Tier-blocked puts sink below every eligible row, even a flagged one. */
function reviewRank(row: ResearchRow): number {
  if (isTierBlocked(row)) return 0;
  return { "DATA GAP": 1, GATED: 2, REVIEW: 3, ADVANCE: 4 }[row.research.status];
}

function compareRows(a: ResearchRow, b: ResearchRow, sort: SortState): number {
  let result = 0;
  switch (sort.key) {
    case "underwrite":
      result =
        reviewRank(a) - reviewRank(b) ||
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
    case "premium":
      result = a.premium - b.premium;
      break;
    case "roi":
      result = a.roc - b.roc;
      break;
    case "drawdown":
      result = compareNullable(a.drawdown52w, b.drawdown52w);
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

export function ScreenerView({ strategy }: { strategy: Strategy }) {
  const initialFilters = useMemo(() => defaultFilters(strategy), [strategy]);
  const [filters, setFilters] = useState<ScreenerFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<ScreenerFilters>(initialFilters);
  const [ready, setReady] = useState(false);
  const [regime, setRegime] = useState<RegimeInfo | null>(null);
  const [regimeLoading, setRegimeLoading] = useState(true);
  const [scan, setScan] = useState<ScanState>(INITIAL_SCAN);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [runRequested, setRunRequested] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [statusScope, setStatusScope] = useState<StatusScope>("all");
  const [shortlistIds, setShortlistIds] = useState<string[]>([]);
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
            // Defaults first, so fields added after the save get their
            // strategy default instead of reading as undefined. The old
            // allTiers switch maps onto the scan scope that replaced it.
            const { allTiers, ...saved } = parsed.filters as ScreenerFilters & {
              allTiers?: boolean;
            };
            nextFilters = {
              ...initialFilters,
              ...saved,
              ...(saved.minRoc === 0.006 ? { minRoc: initialFilters.minRoc } : {}),
              ...(saved.scope === undefined && allTiers !== undefined
                ? { scope: allTiers ? "all" : "1a" }
                : {}),
            };
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

  const shortlist = useMemo(() => new Set(shortlistIds), [shortlistIds]);
  const researchRows = useMemo(
    () => rankResearchRows(scan.rows, scan.fundamentalUniverse, filters),
    [filters, scan.fundamentalUniverse, scan.rows],
  );

  const visibleRows = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    const matching = researchRows.filter((row) => {
      if (filters.stocksOnly && row.kind === "etf") return false;
      if (
        statusScope === "actionable" &&
        row.research.status !== "ADVANCE" &&
        row.research.status !== "REVIEW"
      ) return false;
      if (
        statusScope === "gated" &&
        (row.research.status !== "GATED" || isTierBlocked(row))
      ) return false;
      if (statusScope === "tier-blocked" && !isTierBlocked(row)) return false;
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
    sort,
    statusScope,
  ]);

  const summary = useMemo(() => {
    const symbolsWith = (keep: (row: ResearchRow) => boolean) =>
      new Set(researchRows.filter(keep).map((row) => row.symbol)).size;
    const visibleKind = researchRows.filter(
      (row) => !(filters.stocksOnly && row.kind === "etf"),
    );
    const count = (keep: (row: ResearchRow) => boolean) =>
      visibleKind.filter(keep).length;
    return {
      contractSymbols: symbolsWith(() => true),
      contractRows: researchRows.length,
      statusCounts: {
        all: visibleKind.length,
        actionable: count(
          (row) => row.research.status === "ADVANCE" || row.research.status === "REVIEW",
        ),
        gated: count((row) => row.research.status === "GATED" && !isTierBlocked(row)),
        "tier-blocked": count(isTierBlocked),
        "data-gaps": count((row) => row.research.status === "DATA GAP"),
      } satisfies Record<StatusScope, number>,
    };
  }, [filters.stocksOnly, researchRows]);

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

  const title = strategy === "csp" ? "Cash-Secured Put Scanner" : "Covered Call Scanner";
  const mobileSummary = `${SCAN_SCOPE_LABEL[draftFilters.scope]} · ${draftFilters.minDte}–${draftFilters.maxDte} DTE · ROI ≥ ${(draftFilters.minRoc * 100).toFixed(1)}%`;

  return (
    <div className="pb-24 pt-6 sm:pb-0">
      <header className="mb-4 flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5 sm:gap-y-2">
        <h1 className="text-[1.625rem] font-semibold leading-8 tracking-[-0.035em] sm:text-[1.75rem]">{title}</h1>
        <div className="desk-meta flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-ink-3 sm:w-auto sm:flex-1">
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${scanning ? "animate-pulse bg-cyan" : scan.error ? "bg-coral" : "bg-teal"}`} />
            Cboe 15-min delayed chains
          </span>
          {asOf ? <span className="num">Scanned {fmtDateTime(asOf)}</span> : null}
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
        <section className="mt-3 flex min-h-40 items-center justify-center border border-dashed border-edge-2 bg-panel/40 px-6 py-8 text-center">
          <div className="max-w-lg">
            <ShieldCheck className="mx-auto h-6 w-6 text-cyan" strokeWidth={1.5} aria-hidden />
            <h2 className="mt-3 text-[13px] font-semibold leading-5 text-ink">Run scan to load candidates</h2>
            <p className="mt-2 text-[13px] leading-5 text-ink-2">
              Pick the symbol list and a preset above, then run. Contracts stream
              in as each batch of chains loads.
            </p>
            <button
              type="button"
              onClick={runScan}
              disabled={validationError !== null}
              className="mt-5 inline-flex h-10 items-center justify-center rounded bg-cyan px-5 text-[13px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              Run scan
            </button>
          </div>
        </section>
      ) : (
        <>
          <ScanStatus
            scopeLabel={SCAN_SCOPE_LABEL[filters.scope]}
            attempted={scan.attemptedSymbols.length}
            universeSize={scan.universeSize}
            contractSymbols={summary.contractSymbols}
            contractRows={summary.contractRows}
            failed={scan.failed}
            retrying={scan.retrying}
            done={scan.done}
            error={scan.error}
          />

          <TieredScannerWorkspace
            strategy={strategy}
            rows={visibleRows}
            loadedCount={summary.statusCounts.all}
            statusCounts={summary.statusCounts}
            done={scan.done}
            emptyMessage={
              statusScope !== "all"
                ? "Nothing in this status. Switch to All to see every contract that passed the filters."
                : filters.strategy === "csp" && filters.scope === "1a"
                  ? "No Tier 1A contracts pass the current filters. Try a wider preset, or switch to the IBKR watchlist to see its names flagged by tier."
                  : "No contracts pass the current filters. Try a wider preset or clear the search."
            }
            asOf={asOf}
            query={query}
            searchRef={searchRef}
            statusScope={statusScope}
            sort={sort}
            shortlist={shortlist}
            shortlistRows={loadedShortlistRows}
            shortlistTotal={shortlistIds.length}
            onQuery={setQuery}
            onStatusScope={setStatusScope}
            onSort={updateSort}
            onToggleShortlist={toggleShortlist}
            onClearShortlist={() => {
              setShortlistIds([]);
            }}
          />
        </>
      )}

      {!filtersOpen && !runRequested ? (
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
