"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  CircleHelp,
  ExternalLink,
  Minus,
  Plus,
  Search,
  ShieldAlert,
  Star,
  X,
} from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import type {
  OpportunityTier,
  ResearchRow,
  UnderwriteStatus,
} from "@/lib/research";
import {
  reviewCommentFor,
  reviewScoreLabel,
  statusLabelFor,
} from "@/lib/research-presentation";
import { EARNINGS_TAIL, historicalBreach } from "@/lib/base-rates";
import { fmtDate, fmtDateTime, fmtMoney, fmtNum, fmtPct } from "@/lib/format";
import { cspTierBlock, WATCHLIST_TIER_LABEL } from "@/lib/universe";
import type { Strategy } from "@/lib/types";
import type { SortKey, SortState } from "@/components/screener-results";

export type StatusScope = "all" | "actionable" | "gated" | "tier-blocked" | "data-gaps";

type TieredScannerWorkspaceProps = {
  strategy: Strategy;
  rows: ResearchRow[];
  loadedCount: number;
  statusCounts: Record<StatusScope, number>;
  done: boolean;
  emptyMessage: string;
  asOf: string | null;
  query: string;
  searchRef: RefObject<HTMLInputElement | null>;
  statusScope: StatusScope;
  sort: SortState;
  shortlist: Set<string>;
  shortlistRows: ResearchRow[];
  shortlistTotal: number;
  onQuery: (query: string) => void;
  onStatusScope: (scope: StatusScope) => void;
  onSort: (key: SortKey) => void;
  onToggleShortlist: (row: ResearchRow) => void;
  onClearShortlist: () => void;
};

type DeskSettings = {
  accountCash: number;
  maxPositionPct: number;
};

const DEFAULT_DESK_SETTINGS: DeskSettings = {
  accountCash: 75_000,
  maxPositionPct: 0.35,
};

const DESK_SETTINGS_KEY = "wheeldesk:decision-settings:v1";
const DESK_SETTINGS_EVENT = "wheeldesk:decision-settings-change";

const STATUS_CHIPS: Array<{ id: StatusScope; label: string; title: string }> = [
  { id: "all", label: "All", title: "Every contract that passed the contract filters" },
  {
    id: "actionable",
    label: "Ready / review",
    title: "Tier-eligible contracts with no binding risk flag",
  },
  {
    id: "gated",
    label: "Flagged",
    title: "Tier-eligible, but a triage threshold or event flag binds",
  },
  {
    id: "tier-blocked",
    label: "Tier-blocked",
    title: "Doctrine allows no fresh put on this watchlist tier",
  },
  {
    id: "data-gaps",
    label: "Missing data",
    title: "Not enough verified data to score; never shown as a neutral score",
  },
];

const SETUP_DEFINITION: Record<OpportunityTier, string> = {
  "fallen-general":
    "Fallen general: at least 12% below the 52-week high, quality at least 55, peer valuation P50 or lower, and no worse than -12% over one month.",
  "quality-carry":
    "Quality carry: quality at least 60, peer valuation P65 or lower, and at least 0.65x expected-move coverage.",
  "high-roi":
    "High ROI: period ROI at least 2% and execution score at least 45. IV/RV30 is shown but not scored; it showed no forward edge across 16 underlyings, 2011–2026.",
  watch: "Watch: passed the contract filters but matched no higher setup, or evidence is incomplete.",
};

function subscribeToDeskSettings(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  window.addEventListener(DESK_SETTINGS_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(DESK_SETTINGS_EVENT, callback);
  };
}

function getDeskSettingsSnapshot(): string | null {
  return localStorage.getItem(DESK_SETTINGS_KEY);
}

function getDeskSettingsServerSnapshot(): null {
  return null;
}

function parseDeskSettings(value: string | null): DeskSettings {
  if (!value) return DEFAULT_DESK_SETTINGS;
  try {
    const parsed = JSON.parse(value) as Partial<DeskSettings>;
    if (
      typeof parsed.accountCash === "number" &&
      parsed.accountCash > 0 &&
      typeof parsed.maxPositionPct === "number" &&
      parsed.maxPositionPct > 0 &&
      parsed.maxPositionPct <= 1
    ) {
      return {
        accountCash: parsed.accountCash,
        maxPositionPct: parsed.maxPositionPct,
      };
    }
  } catch {
    // Local persistence is optional; the transparent defaults remain usable.
  }
  return DEFAULT_DESK_SETTINGS;
}

function statusTone(status: UnderwriteStatus): string {
  if (status === "ADVANCE") return "border-teal/55 bg-teal/10 text-teal";
  if (status === "GATED") return "border-coral/55 bg-coral/10 text-coral";
  return "border-amber/55 bg-amber/10 text-amber";
}

function statusText(status: UnderwriteStatus): string {
  if (status === "ADVANCE") return "text-teal";
  if (status === "GATED") return "text-coral";
  return "text-amber";
}

function tierLabel(tier: OpportunityTier): string {
  if (tier === "fallen-general") return "Fallen general";
  if (tier === "quality-carry") return "Quality carry";
  if (tier === "high-roi") return "High ROI";
  return "Watch";
}

function tierTone(tier: OpportunityTier): string {
  if (tier === "fallen-general") return "border-teal/55 bg-teal/[0.07] text-teal";
  if (tier === "quality-carry") return "border-cyan/45 bg-cyan/[0.06] text-cyan";
  if (tier === "high-roi") return "border-amber/55 bg-amber/[0.06] text-amber";
  return "border-edge-2 bg-panel-2 text-ink-2";
}

function unique(items: Array<string | null | undefined>): string[] {
  return [...new Set(items.filter((item): item is string => Boolean(item)))];
}

function expectedMoveFor(row: ResearchRow): number {
  if (row.research.expectedMovePct !== null) return row.research.expectedMovePct;
  if (row.iv !== null) return row.iv * Math.sqrt(row.dte / 365);
  return 0.08;
}

function expiryPnlPerContract(row: ResearchRow, expiryPrice: number): number {
  if (row.strategy === "csp") {
    return row.premium - Math.max(row.strike - expiryPrice, 0) * 100;
  }
  return (Math.min(expiryPrice, row.strike) - row.spot) * 100 + row.premium;
}

function signedPct(value: number | null): string {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${fmtPct(value)}`;
}

function bidPremium(row: ResearchRow, contracts = 1): number | null {
  return row.bid === null ? null : row.bid * 100 * contracts;
}

function askPremium(row: ResearchRow, contracts = 1): number | null {
  return row.ask === null ? null : row.ask * 100 * contracts;
}

function earningsFact(row: ResearchRow): { value: string; warn: boolean } {
  if (!row.eventDataAvailable) return { value: "Calendar off", warn: true };
  if (row.earningsStatus === "in-window") return { value: fmtDate(row.earningsDate), warn: true };
  if (row.earningsStatus === "unknown") return { value: "Unconfirmed", warn: true };
  if (row.earningsStatus === "not-applicable") return { value: "n/a (fund)", warn: false };
  return { value: "After expiry", warn: false };
}

function evidenceFor(row: ResearchRow) {
  const coverage = row.research.expectedMoveCoverage;
  const riskFlags = unique([
    row.strategy === "csp"
      ? `Assignment loss begins below ${fmtMoney(row.breakeven)} at expiry`
      : `Share loss is measured from the displayed ${fmtMoney(row.spot)} basis`,
    row.strategy === "cc"
      ? "Strike is not checked against your assignment floor; doctrine requires calls at or above the assigned strike"
      : null,
    row.research.status === "ADVANCE" ? null : row.research.bindingRisk,
    coverage !== null && coverage < 1
      ? `Buffer covers ${coverage.toFixed(2)}x expected move`
      : null,
    row.return1m !== null && row.return1m < -0.08
      ? `One-month return remains weak at ${signedPct(row.return1m)}`
      : null,
    row.return3m !== null && row.return3m < -0.2
      ? `Three-month return remains weak at ${signedPct(row.return3m)}`
      : null,
    row.earningsStatus === "in-window"
      ? `Earnings ${fmtDate(row.earningsDate)} inside the trade window`
      : null,
    row.research.valuationPercentile !== null && row.research.valuationPercentile > 80
      ? `Effective entry remains expensive versus peers (P${row.research.valuationPercentile})`
      : null,
  ]);

  const missing = unique([
    ...row.research.missingEvidence,
    row.earningsStatus === "unknown" ? "No earnings date confirmed" : null,
    row.research.peerCount < 3 ? "Peer set too thin for a stable percentile" : null,
    !row.eventDataAvailable ? "Forward event calendar unavailable" : null,
    row.high52w === null ? "Full trailing-high context unavailable" : null,
  ]);

  return {
    matched: row.research.opportunityReasons,
    risks: riskFlags.length > 0 ? riskFlags : ["No binding screen-level risk; complete ticker diligence"],
    // The first flag restates the breakeven or share basis already on screen;
    // the compact list starts after it so the CC floor warning leads for calls.
    keyRisks: riskFlags.slice(1, 4),
    missing: missing.length > 0 ? missing : ["No material screen-level data gaps"],
    missingCount: missing.length,
  };
}

export function TieredScannerWorkspace({
  strategy,
  rows,
  loadedCount,
  statusCounts,
  done,
  emptyMessage,
  asOf,
  query,
  searchRef,
  statusScope,
  sort,
  shortlist,
  shortlistRows,
  shortlistTotal,
  onQuery,
  onStatusScope,
  onSort,
  onToggleShortlist,
  onClearShortlist,
}: TieredScannerWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"candidates" | "underwrite">("candidates");
  const [stressMultiple, setStressMultiple] = useState(1);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const sectionRef = useRef<HTMLElement>(null);
  const storedSettings = useSyncExternalStore(
    subscribeToDeskSettings,
    getDeskSettingsSnapshot,
    getDeskSettingsServerSnapshot,
  );
  const deskSettings = useMemo(() => parseDeskSettings(storedSettings), [storedSettings]);

  const selected = rows.find((row) => row.occSymbol === selectedId) ?? rows[0] ?? null;
  const contracts = selected ? quantities[selected.occSymbol] ?? 1 : 1;

  function updateDeskSettings(next: DeskSettings) {
    try {
      localStorage.setItem(DESK_SETTINGS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(DESK_SETTINGS_EVENT));
    } catch {
      // Persistence is optional; current-session controls continue to work.
    }
  }

  // On phones the list and the review share one column, so switching views
  // must bring the top of the new view on screen instead of keeping the scroll.
  function showMobile(view: "candidates" | "underwrite") {
    setMobileView(view);
    window.requestAnimationFrame(() => {
      if (window.matchMedia("(max-width: 1023px)").matches) {
        sectionRef.current?.scrollIntoView({ block: "start" });
      }
    });
  }

  function openSavedRow(row: ResearchRow) {
    onStatusScope("all");
    setSelectedId(row.occSymbol);
    showMobile("underwrite");
  }

  return (
    <section ref={sectionRef} className="mt-3 min-w-0 scroll-mt-16">
      <div className="grid min-w-0 items-start gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(26rem,1fr)]">
        <div className={`min-w-0 ${mobileView === "candidates" ? "block" : "hidden lg:block"}`}>
          <CandidateList
            rows={rows}
            loadedCount={loadedCount}
            statusCounts={statusCounts}
            done={done}
            emptyMessage={emptyMessage}
            selectedId={selected?.occSymbol ?? null}
            query={query}
            searchRef={searchRef}
            statusScope={statusScope}
            sort={sort}
            shortlist={shortlist}
            onQuery={onQuery}
            onStatusScope={onStatusScope}
            onSort={onSort}
            onSelect={(row) => setSelectedId(row.occSymbol)}
            onOpenMobile={(row) => {
              setSelectedId(row.occSymbol);
              showMobile("underwrite");
            }}
            onToggleShortlist={onToggleShortlist}
          />
        </div>

        <div className={`min-w-0 ${mobileView === "underwrite" ? "block" : "hidden lg:block"}`}>
          <UnderwriteInspector
            row={selected}
            asOf={asOf}
            deskSettings={deskSettings}
            stressMultiple={stressMultiple}
            contracts={contracts}
            saved={selected ? shortlist.has(selected.occSymbol) : false}
            onDeskSettings={updateDeskSettings}
            onStressMultiple={setStressMultiple}
            onContracts={(value) => {
              if (!selected) return;
              setQuantities((current) => ({
                ...current,
                [selected.occSymbol]: Math.max(1, Math.min(99, Math.round(value))),
              }));
            }}
            onSave={() => {
              if (selected) onToggleShortlist(selected);
            }}
            onBack={() => showMobile("candidates")}
          />
        </div>
      </div>

      <ShortlistRail
        strategy={strategy}
        rows={shortlistRows}
        total={shortlistTotal}
        quantities={quantities}
        onSelect={openSavedRow}
        onRemove={onToggleShortlist}
        onClear={onClearShortlist}
      />
    </section>
  );
}

function CandidateList({
  rows,
  loadedCount,
  statusCounts,
  done,
  emptyMessage,
  selectedId,
  query,
  searchRef,
  statusScope,
  sort,
  shortlist,
  onQuery,
  onStatusScope,
  onSort,
  onSelect,
  onOpenMobile,
  onToggleShortlist,
}: {
  rows: ResearchRow[];
  loadedCount: number;
  statusCounts: Record<StatusScope, number>;
  done: boolean;
  emptyMessage: string;
  selectedId: string | null;
  query: string;
  searchRef: RefObject<HTMLInputElement | null>;
  statusScope: StatusScope;
  sort: SortState;
  shortlist: Set<string>;
  onQuery: (query: string) => void;
  onStatusScope: (scope: StatusScope) => void;
  onSort: (key: SortKey) => void;
  onSelect: (row: ResearchRow) => void;
  onOpenMobile: (row: ResearchRow) => void;
  onToggleShortlist: (row: ResearchRow) => void;
}) {
  const emptyText = done ? emptyMessage : "Scanning chains and ranking candidates…";

  return (
    <div className="flex w-full min-w-0 flex-col overflow-hidden rounded-lg border border-edge bg-panel lg:min-h-[32rem]">
      <header className="flex min-w-0 flex-col gap-2 border-b border-edge px-3 py-2.5 sm:flex-row sm:items-center">
        <nav aria-label="Review status" className="flex min-w-0 flex-wrap gap-1">
          {STATUS_CHIPS.filter(
            (chip) => chip.id === "all" || chip.id === statusScope || statusCounts[chip.id] > 0,
          ).map((chip) => {
            const active = statusScope === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                aria-pressed={active}
                title={chip.title}
                onClick={() => onStatusScope(chip.id)}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded border px-2.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-cyan/50 bg-cyan/10 text-cyan"
                    : "border-edge text-ink-2 hover:bg-panel-2 hover:text-ink"
                }`}
              >
                {chip.label}
                <span className="num text-[10px] text-ink-3">{statusCounts[chip.id]}</span>
              </button>
            );
          })}
        </nav>
        <label className="relative min-w-0 sm:ml-auto sm:w-52">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search ticker"
            aria-label="Search loaded candidates"
            className="h-8 w-full rounded border border-edge bg-panel-2 pl-8 pr-8 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-cyan/60"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQuery("")}
              aria-label="Clear search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-3 hover:text-ink"
            >
              <X className="h-3 w-3" />
            </button>
          ) : null}
        </label>
      </header>

      <div className="scroller hidden min-h-0 flex-1 overflow-auto lg:block lg:max-h-[70vh]">
        <table className="decision-table w-full border-collapse text-xs">
          <thead>
            <tr className="desk-label text-left text-ink-3">
              <DeskTh label="Ticker" sortKey="symbol" sort={sort} onSort={onSort} />
              <th className="px-2 py-2.5">Contract</th>
              <DeskTh label="Premium" sortKey="premium" sort={sort} onSort={onSort} />
              <DeskTh label="ROI" sortKey="roi" sort={sort} onSort={onSort} />
              <th className="px-2 py-2.5">Breakeven</th>
              <DeskTh label="Status" sortKey="underwrite" sort={sort} onSort={onSort} />
              <th className="w-8 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <DesktopCandidateRow
                key={row.occSymbol}
                row={row}
                selected={row.occSymbol === selectedId}
                saved={shortlist.has(row.occSymbol)}
                onSelect={onSelect}
                onToggleShortlist={onToggleShortlist}
              />
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-20 text-center text-sm text-ink-3">
                  {emptyText}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-edge lg:hidden">
        {rows.map((row) => (
          <MobileCandidateRow
            key={row.occSymbol}
            row={row}
            saved={shortlist.has(row.occSymbol)}
            onOpen={onOpenMobile}
            onToggleShortlist={onToggleShortlist}
          />
        ))}
        {rows.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-ink-3">{emptyText}</p>
        ) : null}
      </div>

      <footer className="desk-meta flex items-center justify-between gap-2 border-t border-edge px-3 py-2 text-ink-3">
        <span>
          Showing <strong className="num font-medium text-ink">{rows.length}</strong> of {loadedCount}
        </span>
        <span className="hidden lg:inline">Click a row to review · / searches</span>
        <span className="lg:hidden">Tap a contract to review</span>
      </footer>
    </div>
  );
}

function DesktopCandidateRow({
  row,
  selected,
  saved,
  onSelect,
  onToggleShortlist,
}: {
  row: ResearchRow;
  selected: boolean;
  saved: boolean;
  onSelect: (row: ResearchRow) => void;
  onToggleShortlist: (row: ResearchRow) => void;
}) {
  return (
    <tr
      tabIndex={0}
      aria-selected={selected}
      onClick={() => onSelect(row)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(row);
        }
      }}
      className={`cursor-pointer border-b border-edge transition-colors last:border-b-0 hover:bg-panel-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-cyan ${
        selected ? "bg-cyan/[0.055] shadow-[inset_2px_0_0_var(--color-cyan)]" : "bg-desk"
      }`}
    >
      <td className="px-2 py-2.5">
        <span className="flex items-center gap-1.5">
          <span className="font-semibold text-ink">{row.symbol}</span>
          <WatchlistBadge row={row} />
        </span>
        <span className="desk-meta num mt-0.5 block text-ink-3">{fmtMoney(row.spot)}</span>
      </td>
      <td className="px-2 py-2.5">
        <span className="num block font-medium text-ink">{fmtMoney(row.strike, 0)} {row.strategy === "csp" ? "put" : "call"}</span>
        <span className="desk-meta num mt-0.5 block text-ink-3">{fmtDate(row.expiration)} · {row.dte}d · Δ {Math.abs(row.delta ?? 0).toFixed(2)}</span>
      </td>
      <td className="num px-2 py-2.5 text-[13px] font-medium text-ink">{fmtMoney(row.premium, 0)}</td>
      <td className="num px-2 py-2.5 text-[13px] font-medium text-cyan">{fmtPct(row.roc, 2)}</td>
      <td className="num px-2 py-2.5">
        <span className="block text-ink">{fmtMoney(row.breakeven)}</span>
        <span className="desk-meta mt-0.5 block text-ink-3">
          {row.strategy === "csp" ? `${fmtPct(row.research.riskBufferPct)} below spot` : `${fmtPct(row.otmPct)} OTM`}
        </span>
      </td>
      <td className="px-2 py-2.5">
        <span className="flex items-center gap-1.5">
          <span title={reviewCommentFor(row)} className={`text-[11px] font-medium leading-4 ${statusText(row.research.status)}`}>
            {statusLabelFor(row)}
          </span>
          <EarningsMarker row={row} />
        </span>
        <span title={SETUP_DEFINITION[row.research.opportunityTier]} className="desk-meta mt-0.5 block text-ink-3">
          {tierLabel(row.research.opportunityTier)}
        </span>
      </td>
      <td className="px-2 py-2.5">
        <ShortlistStar row={row} saved={saved} onToggle={onToggleShortlist} />
      </td>
    </tr>
  );
}

function MobileCandidateRow({
  row,
  saved,
  onOpen,
  onToggleShortlist,
}: {
  row: ResearchRow;
  saved: boolean;
  onOpen: (row: ResearchRow) => void;
  onToggleShortlist: (row: ResearchRow) => void;
}) {
  return (
    <article
      tabIndex={0}
      onClick={() => onOpen(row)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(row);
        }
      }}
      className="flex cursor-pointer items-center gap-3 bg-desk px-3 py-3 transition-colors active:bg-panel-2"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <strong className="text-[15px] text-ink">{row.symbol}</strong>
          <WatchlistBadge row={row} />
          <span className={`text-[11px] font-medium ${statusText(row.research.status)}`}>{statusLabelFor(row)}</span>
          <EarningsMarker row={row} />
        </div>
        <p className="num mt-1 truncate text-xs text-ink-2">
          {fmtMoney(row.strike, 0)} {row.strategy === "csp" ? "put" : "call"} · {fmtDate(row.expiration)} · {row.dte}d · Δ{Math.abs(row.delta ?? 0).toFixed(2)}
        </p>
      </div>
      <div className="num shrink-0 text-right">
        <strong className="block text-[15px] font-medium text-cyan">{fmtPct(row.roc, 2)}</strong>
        <span className="block text-xs text-ink-2">{fmtMoney(row.premium, 0)}</span>
      </div>
      <ShortlistStar row={row} saved={saved} onToggle={onToggleShortlist} />
    </article>
  );
}

/**
 * Only the earnings states a trader must act on get a row marker. A missing
 * calendar date means the feed does not cover the name, never that no report
 * is due, so it is flagged rather than left to read as an all-clear.
 */
function EarningsMarker({ row }: { row: ResearchRow }) {
  const label = !row.eventDataAvailable
    ? "No calendar"
    : row.earningsStatus === "unknown"
      ? "Earnings ?"
      : row.earningsStatus === "in-window"
        ? `Earns ${fmtDate(row.earningsDate)}`
        : null;
  if (!label) return null;
  return (
    <span
      title={
        row.earningsStatus === "in-window"
          ? "Earnings fall before this expiry"
          : "No confirmed earnings date: the calendar does not cover this name"
      }
      className="num whitespace-nowrap rounded border border-amber/50 px-1 text-[9px] leading-[14px] text-amber"
    >
      {label}
    </span>
  );
}

function ShortlistStar({
  row,
  saved,
  onToggle,
}: {
  row: ResearchRow;
  saved: boolean;
  onToggle: (row: ResearchRow) => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggle(row);
      }}
      aria-label={`${saved ? "Remove" : "Save"} ${row.symbol} ${row.strike} ${row.strategy === "csp" ? "put" : "call"} ${saved ? "from" : "to"} shortlist`}
      aria-pressed={saved}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded transition-colors lg:h-7 lg:w-7 ${saved ? "text-cyan" : "text-ink-3 hover:text-ink"}`}
    >
      <Star className={`h-4 w-4 lg:h-3.5 lg:w-3.5 ${saved ? "fill-current" : ""}`} />
    </button>
  );
}

function DeskTh({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState;
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === sortKey;
  return (
    <th
      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined}
      className="px-2 py-2.5"
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 uppercase tracking-[0.1em] transition-colors hover:text-ink ${active ? "text-cyan" : ""}`}
      >
        {label}
        {active ? <ChevronDown className={`h-3 w-3 ${sort.direction === "asc" ? "rotate-180" : ""}`} /> : null}
      </button>
    </th>
  );
}

function UnderwriteInspector({
  row,
  asOf,
  deskSettings,
  stressMultiple,
  contracts,
  saved,
  onDeskSettings,
  onStressMultiple,
  onContracts,
  onSave,
  onBack,
}: {
  row: ResearchRow | null;
  asOf: string | null;
  deskSettings: DeskSettings;
  stressMultiple: number;
  contracts: number;
  saved: boolean;
  onDeskSettings: (settings: DeskSettings) => void;
  onStressMultiple: (value: number) => void;
  onContracts: (value: number) => void;
  onSave: () => void;
  onBack: () => void;
}) {
  if (!row) {
    return (
      <div className="flex min-h-72 items-center justify-center rounded-lg border border-dashed border-edge-2 bg-panel/60 p-8 text-center">
        <div className="max-w-xs">
          <ShieldAlert className="mx-auto h-6 w-6 text-cyan" strokeWidth={1.5} />
          <h2 className="mt-3 text-sm font-semibold">No contract selected</h2>
          <button type="button" onClick={onBack} className="mt-4 text-xs font-medium text-cyan lg:hidden">
            View candidates
          </button>
        </div>
      </div>
    );
  }

  const put = row.strategy === "csp";
  const expectedMove = expectedMoveFor(row);
  const scenarioPrice = Math.max(0, row.spot * (1 - stressMultiple * expectedMove));
  const scenarioPnl = expiryPnlPerContract(row, scenarioPrice) * contracts;
  const collateralPerContract = (put ? row.strike : row.spot) * 100;
  const collateral = collateralPerContract * contracts;
  const totalPremium = row.premium * contracts;
  const allocationPct = collateral / Math.max(deskSettings.accountCash, 1);
  const positionLimit = deskSettings.accountCash * deskSettings.maxPositionPct;
  const maxContracts = Math.floor(positionLimit / Math.max(collateralPerContract, 1));
  const outsideBy = Math.max(0, collateral - positionLimit);
  const evidence = evidenceFor(row);
  const comment = reviewCommentFor(row);
  const breach = historicalBreach(row);
  const earnings = earningsFact(row);
  const ReviewIcon =
    row.research.status === "ADVANCE"
      ? CheckCircle2
      : row.research.status === "GATED"
        ? AlertTriangle
        : CircleHelp;

  return (
    <article className="w-full min-w-0 overflow-hidden rounded-lg border border-edge bg-panel lg:sticky lg:top-[4.25rem] lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
      <header className="border-b border-edge px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          className="mb-2 inline-flex h-9 items-center gap-1 text-xs text-ink-2 lg:hidden"
        >
          <ChevronLeft className="h-4 w-4" /> All candidates
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold leading-5 tracking-[-0.02em] text-ink">
              {row.symbol} · {fmtMoney(row.strike, 0)} {put ? "put" : "call"} · {fmtDate(row.expiration)}
              <span className="desk-meta ml-1 font-normal tracking-normal text-ink-3">· {row.dte} DTE</span>
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-semibold leading-4 ${statusTone(row.research.status)}`}>
                {statusLabelFor(row)}
              </span>
              <WatchlistBadge row={row} large />
              <span title={SETUP_DEFINITION[row.research.opportunityTier]} className={`inline-flex rounded border px-2 py-0.5 text-[10px] font-medium leading-4 ${tierTone(row.research.opportunityTier)}`}>
                {tierLabel(row.research.opportunityTier)}
              </span>
            </div>
            <p className={`mt-2 flex max-w-xl items-start gap-1.5 text-xs leading-[1.45] ${statusText(row.research.status) === "text-amber" ? "text-ink-2" : statusText(row.research.status)}`}>
              <ReviewIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{comment}</span>
            </p>
          </div>
          <Link
            href={`/ticker/${row.symbol}`}
            aria-label={`Open ${row.symbol} ticker workbench`}
            className="grid h-9 w-9 shrink-0 place-items-center rounded border border-edge text-ink-3 transition-colors hover:bg-panel-2 hover:text-ink"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <section aria-label="Contract economics" className="border-b border-edge">
        <div className="grid grid-cols-2 divide-x divide-edge border-b border-edge sm:grid-cols-4">
          <HeroMetric label="Premium @ mid" value={fmtMoney(totalPremium, 0)} accent />
          <HeroMetric
            label={`ROI · ${fmtPct(row.rocAnnualized, 0)} ann.`}
            value={fmtPct(row.roc, 2)}
            accent
            title={put ? "Premium ÷ strike collateral for the period" : "Premium ÷ current share value for the period"}
          />
          <HeroMetric label={put ? "Cash secured" : "Share value"} value={fmtMoney(collateral, 0)} />
          <HeroMetric label="Breakeven" value={fmtMoney(row.breakeven)} />
        </div>
        <div className="grid grid-cols-[auto_1fr_1fr_1fr] items-end gap-3 px-3 py-2.5">
          <QuantityStepper value={contracts} onChange={onContracts} />
          <SmallDatum label="Bid" value={fmtMoney(bidPremium(row, contracts), 0)} detail={row.bid === null ? "—" : row.bid.toFixed(2)} />
          <SmallDatum label="Ask" value={fmtMoney(askPremium(row, contracts), 0)} detail={row.ask === null ? "—" : row.ask.toFixed(2)} />
          <SmallDatum label="Spread" value={fmtPct(row.spreadPct, 1)} detail={`mid ${row.mid.toFixed(2)}`} tone={(row.spreadPct ?? 0) > 0.12 ? "risk" : "default"} />
        </div>
      </section>

      <section aria-label="Key facts" className="grid grid-cols-3 gap-x-3 gap-y-3 border-b border-edge px-3 py-3 sm:grid-cols-6">
        <SmallDatum label="Delta" value={row.delta === null ? "—" : Math.abs(row.delta).toFixed(2)} />
        <SmallDatum label={put ? "Cushion" : "OTM"} value={fmtPct(put ? row.research.riskBufferPct : row.otmPct)} />
        <SmallDatum label="IV" value={fmtPct(row.iv)} />
        <SmallDatum label="Open int." value={fmtNum(row.openInterest)} tone={(row.openInterest ?? 0) < 100 ? "risk" : "default"} />
        <SmallDatum label="Earnings" value={earnings.value} tone={earnings.warn ? "risk" : "good"} />
        <SmallDatum label="52w drop" value={row.drawdown52w === null ? "—" : fmtPct(row.drawdown52w)} />
      </section>

      {evidence.keyRisks.length > 0 ? (
        <section aria-label="Key risks" className="border-b border-edge px-3 py-2.5">
          <ul className="space-y-1 text-xs leading-[1.45] text-ink-2">
            {evidence.keyRisks.map((item) => (
              <li key={item} className="flex gap-1.5">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-coral" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <Collapsible
        title="Position sizing"
        summary={outsideBy > 0 ? `over limit by ${fmtMoney(outsideBy, 0)}` : `max ${maxContracts} contract${maxContracts === 1 ? "" : "s"}`}
        warn={outsideBy > 0}
      >
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 px-3 pb-3 sm:grid-cols-4">
          <NumberSetting
            label="Account cash"
            prefix="$"
            value={deskSettings.accountCash}
            step={5_000}
            onChange={(accountCash) => onDeskSettings({ ...deskSettings, accountCash: Math.max(1_000, accountCash) })}
          />
          <NumberSetting
            label="Max position"
            suffix="%"
            value={Number((deskSettings.maxPositionPct * 100).toFixed(0))}
            step={5}
            onChange={(value) => onDeskSettings({ ...deskSettings, maxPositionPct: Math.min(1, Math.max(0.05, value / 100)) })}
          />
          <SmallDatum label="Max contracts" value={String(maxContracts)} detail={`${fmtMoney(positionLimit, 0)} limit`} />
          <SmallDatum label="Capital used" value={fmtPct(allocationPct)} detail={`${fmtMoney(collateral, 0)} total`} tone={outsideBy > 0 ? "risk" : "good"} />
        </div>
        <p className={`desk-meta mx-3 mb-3 flex items-center gap-2 border px-2.5 py-2 ${outsideBy > 0 ? "border-coral/60 bg-coral/[0.05] text-coral" : "border-teal/50 bg-teal/[0.05] text-teal"}`}>
          {outsideBy > 0 ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
          {outsideBy > 0
            ? `Outside the position limit by ${fmtMoney(outsideBy, 0)}`
            : `${fmtMoney(positionLimit - collateral, 0)} of position headroom remains`}
        </p>
      </Collapsible>

      <Collapsible
        title="Stress at expiry"
        summary={`−${stressMultiple.toFixed(1)}× move: ${fmtMoney(scenarioPnl, 0)}`}
        warn={scenarioPnl < 0}
      >
        <div className="px-3 pb-2">
          <select
            value={stressMultiple}
            onChange={(event) => onStressMultiple(Number(event.target.value))}
            aria-label="Stress state"
            className="h-9 rounded border border-edge bg-panel-2 px-2.5 text-xs text-ink-2 outline-none focus:border-cyan/60"
          >
            <option value={0.5}>−0.5x expected move</option>
            <option value={1}>−1.0x expected move</option>
            <option value={1.5}>−1.5x expected move</option>
            <option value={2}>−2.0x expected move</option>
          </select>
          <span className="desk-meta ml-3 text-ink-3">
            Price <strong className="num font-medium text-ink">{fmtMoney(scenarioPrice)}</strong>
          </span>
        </div>
        <div className="border-y border-edge bg-desk/50 px-2 pb-1 pt-2">
          <PayoffChart
            row={row}
            contracts={contracts}
            scenarioPrice={scenarioPrice}
            scenarioPnl={scenarioPnl}
          />
        </div>
        <p className="desk-meta px-3 py-2 leading-5 text-ink-3">
          Expiry-only estimate · excludes early assignment, slippage, tax, dividends, and rolling.
        </p>
      </Collapsible>

      <Collapsible
        title="Measured base rates"
        summary={breach ? `${put ? "finished below" : "finished above"} ${breach.beyondGrid ? "≤" : ""}${fmtPct(breach.finish, 1)}` : "not measured"}
        warn={breach !== null && breach.finish >= 0.2}
      >
        <BaseRates row={row} />
      </Collapsible>

      <Collapsible
        title="Price & quality"
        summary={`quality ${row.research.qualityScore ?? "—"} · value ${row.research.valuationPercentile === null ? "—" : `P${row.research.valuationPercentile}`}`}
      >
        <PriceSetupRail row={row} />
      </Collapsible>

      <Collapsible
        title="All evidence"
        summary={`${evidence.risks.length} flag${evidence.risks.length === 1 ? "" : "s"} · ${evidence.missingCount} gap${evidence.missingCount === 1 ? "" : "s"}`}
      >
        <p className="desk-meta num px-3 pb-2 text-ink-3">
          {reviewScoreLabel(row)} · data confidence {row.research.confidence}%
        </p>
        <EvidenceGrid evidence={evidence} />
      </Collapsible>

      <footer className="sticky bottom-0 z-10 flex gap-2 border-t border-edge bg-panel/95 p-2.5 backdrop-blur">
        <Link
          href={`/ticker/${row.symbol}`}
          className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded border border-edge-2 text-xs font-medium text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open ticker
        </Link>
        <button
          type="button"
          onClick={onSave}
          className={`inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded border text-xs font-semibold transition-colors ${
            saved ? "border-teal/50 bg-teal/10 text-teal" : "border-cyan bg-cyan text-black hover:opacity-90"
          }`}
        >
          {saved ? <Check className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
          {saved ? "Saved to shortlist" : "Save to shortlist"}
        </button>
      </footer>

      <p className="flex flex-wrap justify-between gap-x-3 gap-y-1 border-t border-edge px-3 py-2 text-[10px] leading-4 text-ink-3">
        <span>Cboe delayed chain · {fmtDateTime(row.chainAsOf)}</span>
        <span>
          {row.fundamentals.source === "nasdaq" ? "Nasdaq reported fundamentals" : row.fundamentals.note ?? "Fundamentals unavailable"}
          {row.priceHistorySource
            ? ` · ${row.priceHistorySource === "yahoo" ? "Public market data" : row.priceHistorySource.toUpperCase()} ${row.priceHistoryObservations}d history`
            : " · price history unavailable"}
          {asOf ? ` · scanned ${fmtDateTime(asOf)}` : ""}
        </span>
      </p>
    </article>
  );
}

function Collapsible({
  title,
  summary,
  warn = false,
  children,
}: {
  title: string;
  summary: string;
  warn?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group border-b border-edge">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 hover:bg-panel-2 [&::-webkit-details-marker]:hidden">
        <h3 className="desk-section-title shrink-0 text-ink">{title}</h3>
        <span className={`desk-meta num ml-auto truncate ${warn ? "text-coral" : "text-ink-3"}`}>{summary}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      {children}
    </details>
  );
}

function EvidenceGrid({ evidence }: { evidence: ReturnType<typeof evidenceFor> }) {
  return (
    <div className="grid divide-y divide-edge border-t border-edge sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <EvidenceColumn title="Why it matched" items={evidence.matched} tone="teal" icon={CheckCircle2} />
      <EvidenceColumn title="Risk flags" items={evidence.risks} tone="coral" icon={AlertTriangle} />
      <EvidenceColumn title="Data gaps" items={evidence.missing} tone="muted" icon={CircleHelp} />
    </div>
  );
}

function HeroMetric({
  label,
  value,
  accent = false,
  title,
}: {
  label: string;
  value: string;
  accent?: boolean;
  title?: string;
}) {
  return (
    <div title={title} className="min-w-0 px-3 py-3 text-center">
      <strong className={`num block truncate text-lg font-medium leading-6 ${accent ? "text-cyan" : "text-ink"}`}>{value}</strong>
      <span className="desk-meta mt-1 block truncate text-ink-3">{label}</span>
    </div>
  );
}

function watchlistTierTitle(row: ResearchRow): string {
  const block = cspTierBlock(row.watchlistTier, row.tierProxy);
  if (!block) return "Watchlist Tier 1A: eligible for fresh cash-secured puts";
  return row.strategy === "cc" ? `${block}. Covered calls are not tier-gated.` : block;
}

function WatchlistBadge({ row, large = false }: { row: ResearchRow; large?: boolean }) {
  const tier = row.watchlistTier;
  const tone =
    tier === "1A"
      ? "border-edge-2 text-ink-3"
      : tier === "1A-pending" || tier === "1B" || tier === "untiered"
        ? "border-amber/55 text-amber"
        : "border-coral/55 text-coral";
  const label =
    tier === "1B" && row.tierProxy ? `1B · ${row.tierProxy}` : WATCHLIST_TIER_LABEL[tier];
  return (
    <span
      title={watchlistTierTitle(row)}
      className={`inline-flex shrink-0 whitespace-nowrap rounded border font-medium ${
        large ? "px-2 py-1 text-[10px] leading-4" : "px-1 text-[9px] leading-[14px]"
      } ${tone}`}
    >
      {large ? `Watchlist ${label}` : label}
    </span>
  );
}

function BaseRates({ row }: { row: ResearchRow }) {
  const breach = historicalBreach(row);
  const put = row.strategy === "csp";
  const rate = (value: number) =>
    breach?.beyondGrid ? `≤${fmtPct(value, 1)}` : fmtPct(value, 1);

  return (
    <div className="px-3 pb-3">
      {breach ? (
        <>
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
            <SmallDatum
              label={put ? "Finished below strike" : "Finished above strike"}
              value={rate(breach.finish)}
              detail={`${breach.sigmas.toFixed(2)}σ from spot`}
              tone={breach.finish >= 0.2 ? "risk" : "default"}
            />
            <SmallDatum label="Touched strike" value={rate(breach.touch)} detail="daily high / low" />
            <SmallDatum label="Lognormal at IV30" value={fmtPct(breach.lognormal, 1)} detail="same σ distance" />
            <SmallDatum
              label="Model P(ITM)"
              value={fmtPct(row.pItm, 1)}
              detail="contract IV"
            />
          </div>
          <p className="desk-meta mt-2 leading-5 text-ink-3">
            Historical share of {fmtNum(breach.observations)} entry days on {breach.underlyingCount} liquid
            underlyings with a Cboe 30-day IV index ({breach.fromYear}–{breach.toYear}) where a strike this
            many IV30 sigmas out {put ? "finished below" : "finished above"} it; single names exclude earnings
            windows.
            {breach.ownFinish !== null ? ` ${row.symbol} alone: ${rate(breach.ownFinish)}.` : ""} A base rate
            for the distance, not a forecast for this name.
          </p>
        </>
      ) : (
        <p className="desk-meta leading-5 text-ink-3">
          {row.iv30 === null
            ? "Historical breach rate needs the underlying's 30-day IV, which this chain did not supply."
            : row.dte < 14 || row.dte > 60
              ? "Historical breach rates are measured for 14–60 DTE only."
              : "Historical breach rates apply to out-of-the-money strikes only."}
        </p>
      )}

      {row.earningsStatus === "in-window" ? (
        <p className="desk-meta mt-2 flex items-start gap-2 border border-amber/50 bg-amber/[0.05] px-2.5 py-2 leading-5 text-amber">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Earnings {fmtDate(row.earningsDate)} fall inside this window, so the earnings-free rates above
            understate risk.{" "}
            {put
              ? `${fmtPct(EARNINGS_TAIL.worseThanMinus10, 1)} of S&P 500 earnings releases moved worse than −10% versus SPY over the two-day reaction window`
              : `${fmtPct(EARNINGS_TAIL.betterThanPlus10, 1)} of S&P 500 earnings releases moved better than +10% versus SPY over the two-day reaction window`}{" "}
            ({fmtNum(EARNINGS_TAIL.releases)} releases, {EARNINGS_TAIL.fromYear}–{EARNINGS_TAIL.toYear}). A large-cap
            base rate, not a probability for {row.symbol}.
          </span>
        </p>
      ) : null}

      <p className="desk-meta mt-2 text-ink-3">VCG Research · compiled from public market data</p>
    </div>
  );
}

function SmallDatum({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "good" | "risk";
}) {
  return (
    <div className="min-w-0">
      <span className="desk-label block truncate text-ink-3">{label}</span>
      <strong className={`num mt-1 block truncate text-xs font-medium leading-4 ${tone === "good" ? "text-teal" : tone === "risk" ? "text-coral" : "text-ink"}`}>{value}</strong>
      {detail ? <span className="desk-meta num mt-0.5 block truncate text-ink-3">{detail}</span> : null}
    </div>
  );
}

function QuantityStepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <span className="desk-label mb-1 block text-ink-3">Contracts</span>
      <div className="flex h-9 overflow-hidden rounded border border-edge bg-desk">
        <button type="button" onClick={() => onChange(value - 1)} aria-label="Decrease contracts" className="grid w-9 place-items-center border-r border-edge text-ink-2 hover:bg-panel-2 hover:text-ink">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="num grid min-w-10 place-items-center text-[13px] text-ink">{value}</span>
        <button type="button" onClick={() => onChange(value + 1)} aria-label="Increase contracts" className="grid w-9 place-items-center border-l border-edge text-ink-2 hover:bg-panel-2 hover:text-ink">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function PriceSetupRail({ row }: { row: ResearchRow }) {
  const high = row.high52w;
  const points = [high, row.spot, row.strike, row.breakeven].filter(
    (value): value is number => value !== null,
  );
  const max = Math.max(...points);
  const min = Math.min(...points);
  const position = (value: number | null) =>
    value === null ? 0 : ((max - value) / Math.max(0.01, max - min)) * 100;
  const markers = [
    { label: "52w high", value: high, color: "border-ink bg-desk" },
    { label: "Current", value: row.spot, color: "border-ink bg-desk" },
    { label: "Strike", value: row.strike, color: "border-cyan bg-cyan" },
    { label: "Breakeven", value: row.breakeven, color: "border-teal bg-teal" },
  ];

  return (
    <div className="px-3 pb-3">
      <div className="desk-meta grid grid-cols-4 gap-2 text-ink-3">
        {markers.map((marker) => (
          <span key={marker.label} className="min-w-0">
            <span className="block truncate">{marker.label}</span>
            <strong className="num mt-0.5 block truncate text-xs font-medium text-ink">{fmtMoney(marker.value)}</strong>
          </span>
        ))}
      </div>
      <div className="relative my-4 h-px bg-edge-2">
        {markers.map((marker) =>
          marker.value === null ? null : (
            <span
              key={marker.label}
              title={`${marker.label}: ${fmtMoney(marker.value)}`}
              className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border ${marker.color}`}
              style={{ left: `${position(marker.value)}%` }}
            />
          ),
        )}
      </div>
      <div className="grid grid-cols-5 divide-x divide-edge border-t border-edge pt-2 text-center">
        <SetupDatum label="Below 52w high" value={row.drawdown52w === null ? "—" : `${(row.drawdown52w * 100).toFixed(1)}%`} tone="risk" />
        <SetupDatum label="Quality" value={row.research.qualityScore === null ? "—" : String(row.research.qualityScore)} tone="good" />
        <SetupDatum label="Valuation" value={row.research.valuationPercentile === null ? "—" : `P${row.research.valuationPercentile}`} />
        <SetupDatum label="1m return" value={signedPct(row.return1m)} tone={(row.return1m ?? 0) >= 0 ? "good" : "risk"} />
        <SetupDatum label="3m return" value={signedPct(row.return3m)} tone={(row.return3m ?? 0) >= 0 ? "good" : "risk"} />
      </div>
    </div>
  );
}

function SetupDatum({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "good" | "risk" }) {
  return (
    <span className="min-w-0 px-1.5">
      <strong className={`num block truncate text-xs font-medium leading-4 ${tone === "good" ? "text-teal" : tone === "risk" ? "text-coral" : "text-ink"}`}>{value}</strong>
      <span className="mt-0.5 block truncate text-[10px] leading-4 text-ink-3">{label}</span>
    </span>
  );
}

function NumberSetting({
  label,
  value,
  prefix,
  suffix,
  step,
  onChange,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="min-w-0">
      <span className="desk-label mb-1 block text-ink-3">{label}</span>
      <span className="flex h-9 items-center rounded border border-edge bg-panel-2 px-2 focus-within:border-cyan/60">
        {prefix ? <span className="desk-meta num text-ink-3">{prefix}</span> : null}
        <input
          type="number"
          value={value}
          step={step}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
          className="num min-w-0 flex-1 bg-transparent px-1 text-[13px] text-ink outline-none"
        />
        {suffix ? <span className="desk-meta num text-ink-3">{suffix}</span> : null}
      </span>
    </label>
  );
}

function EvidenceColumn({
  title,
  items,
  tone,
  icon: Icon,
}: {
  title: string;
  items: string[];
  tone: "teal" | "coral" | "muted";
  icon: typeof CheckCircle2;
}) {
  const toneClass = tone === "teal" ? "text-teal" : tone === "coral" ? "text-coral" : "text-ink-2";
  return (
    <section className="min-w-0 px-3 py-3">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold leading-4 text-ink">
        <Icon className={`h-3.5 w-3.5 ${toneClass}`} /> {title}
      </h3>
      <ul className="mt-2 space-y-1 text-[11px] leading-[1.45] text-ink-2">
        {items.slice(0, 5).map((item) => (
          <li key={item} className="flex gap-1.5"><span className={toneClass}>•</span><span>{item}</span></li>
        ))}
      </ul>
    </section>
  );
}

function PayoffChart({
  row,
  contracts,
  scenarioPrice,
  scenarioPnl,
}: {
  row: ResearchRow;
  contracts: number;
  scenarioPrice: number;
  scenarioPnl: number;
}) {
  const chart = useMemo(() => {
    const move = Math.max(expectedMoveFor(row), 0.04);
    const low = Math.max(0.01, Math.min(row.breakeven, scenarioPrice, row.spot * (1 - move * 2.1)));
    const high = Math.max(row.strike, row.spot) * (1 + move * 1.2);
    const points = Array.from({ length: 49 }, (_, index) => {
      const price = low + (high - low) * (index / 48);
      return { price, pnl: expiryPnlPerContract(row, price) * contracts };
    });
    const minPnl = Math.min(0, scenarioPnl, ...points.map((point) => point.pnl));
    const maxPnl = Math.max(0, scenarioPnl, ...points.map((point) => point.pnl));
    return { low, high, points, minPnl, maxPnl };
  }, [contracts, row, scenarioPnl, scenarioPrice]);

  const width = 620;
  const height = 140;
  const left = 46;
  const right = 12;
  const top = 10;
  const bottom = 22;
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const yRange = Math.max(1, chart.maxPnl - chart.minPnl);
  const x = (price: number) => left + ((price - chart.low) / Math.max(0.01, chart.high - chart.low)) * innerWidth;
  const y = (pnl: number) => top + ((chart.maxPnl - pnl) / yRange) * innerHeight;
  const path = chart.points.map((point, index) => `${index === 0 ? "M" : "L"}${x(point.price).toFixed(1)},${y(point.pnl).toFixed(1)}`).join(" ");
  const xTicks = Array.from({ length: 5 }, (_, index) => chart.low + (chart.high - chart.low) * (index / 4));
  const yTicks = Array.from({ length: 4 }, (_, index) => chart.maxPnl - yRange * (index / 3));
  const markers = [
    { label: "Breakeven", price: row.breakeven, dash: "5 4", color: "#a8aeba" },
    { label: "Strike", price: row.strike, dash: "3 3", color: "#00e5ff" },
    { label: "Spot", price: row.spot, dash: "1 3", color: "#767d8a" },
  ].filter((marker) => marker.price >= chart.low && marker.price <= chart.high);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Expiry payoff chart. Scenario price ${fmtMoney(scenarioPrice)} produces ${fmtMoney(scenarioPnl, 0)} profit or loss for ${contracts} contract${contracts === 1 ? "" : "s"}.`} className="h-auto w-full overflow-hidden">
      {yTicks.map((tick) => (
        <g key={tick}>
          <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="#23262e" strokeWidth="1" />
          <text x={left - 6} y={y(tick) + 3} textAnchor="end" fill="#767d8a" fontSize="10" fontFamily="var(--font-geist-mono)">{fmtMoney(tick, 0)}</text>
        </g>
      ))}
      {markers.map((marker) => (
        <g key={marker.label}>
          <line x1={x(marker.price)} x2={x(marker.price)} y1={top} y2={height - bottom} stroke={marker.color} strokeWidth="1" strokeDasharray={marker.dash} />
          <text x={x(marker.price) + 3} y={top + 8} fill={marker.color} fontSize="9">{marker.label}</text>
        </g>
      ))}
      <line x1={left} x2={width - right} y1={y(0)} y2={y(0)} stroke="#333843" strokeWidth="1" strokeDasharray="2 3" />
      <path d={path} fill="none" stroke="#00e5ff" strokeWidth="2.25" vectorEffect="non-scaling-stroke" />
      <line x1={x(scenarioPrice)} x2={x(scenarioPrice)} y1={top} y2={height - bottom} stroke="#ff3b4a" strokeWidth="1" strokeDasharray="4 3" />
      <circle cx={x(scenarioPrice)} cy={y(scenarioPnl)} r="4" fill="#07080a" stroke={scenarioPnl < 0 ? "#ff3b4a" : "#00d4aa"} strokeWidth="2" />
      {xTicks.map((tick) => (
        <text key={tick} x={x(tick)} y={height - 7} textAnchor="middle" fill="#767d8a" fontSize="10" fontFamily="var(--font-geist-mono)">{fmtMoney(tick, 0)}</text>
      ))}
    </svg>
  );
}

function ShortlistRail({
  strategy,
  rows,
  total,
  quantities,
  onSelect,
  onRemove,
  onClear,
}: {
  strategy: Strategy;
  rows: ResearchRow[];
  total: number;
  quantities: Record<string, number>;
  onSelect: (row: ResearchRow) => void;
  onRemove: (row: ResearchRow) => void;
  onClear: () => void;
}) {
  if (total === 0) return null;
  const totals = rows.reduce(
    (sum, row) => {
      const quantity = quantities[row.occSymbol] ?? 1;
      return {
        premium: sum.premium + row.premium * quantity,
        collateral:
          sum.collateral +
          (row.strategy === "csp" ? row.strike : row.spot) * 100 * quantity,
      };
    },
    { premium: 0, collateral: 0 },
  );
  const blendedRoi = totals.collateral > 0 ? totals.premium / totals.collateral : null;

  return (
    <div className="mt-3 hidden items-center gap-2 overflow-hidden border border-edge bg-panel px-3 py-2 lg:flex">
      <Bookmark className="h-4 w-4 text-cyan" />
      <div className="mr-1 shrink-0">
        <p className="text-xs font-semibold text-ink">Shortlist</p>
        <p className="desk-meta num text-ink-3">{total} saved</p>
      </div>
      <div className="scroller flex min-w-0 flex-1 gap-2 overflow-x-auto">
        {rows.slice(0, 3).map((row) => (
          <div key={row.occSymbol} className="group flex min-w-44 shrink-0 items-center border border-edge bg-desk transition-colors hover:border-edge-2">
            <button type="button" onClick={() => onSelect(row)} className="min-w-0 flex-1 px-2.5 py-1.5 text-left">
              <span className="block text-xs font-medium text-ink">{row.symbol} <span className="num text-[10px] text-ink-2">· {fmtMoney(row.strike, 0)} {strategy === "csp" ? "put" : "call"}</span></span>
              <span className="desk-meta num mt-0.5 flex items-center justify-between gap-2 text-ink-3">
                <span>{fmtDate(row.expiration)} · {row.dte}d</span>
                <span className="text-teal">{fmtMoney(row.premium * (quantities[row.occSymbol] ?? 1), 0)} · {fmtPct(row.roc, 2)}</span>
              </span>
            </button>
            <button type="button" onClick={() => onRemove(row)} aria-label={`Remove ${row.symbol} from shortlist`} className="mr-1 rounded p-1 text-ink-3 transition-colors hover:text-ink">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {total > rows.length ? <span className="desk-meta self-center text-ink-3">+{total - rows.length} saved in other scans</span> : null}
      </div>
      <div className="flex shrink-0 divide-x divide-edge border-l border-edge pl-2">
        <RailTotal label={total > rows.length ? "Loaded premium" : "Premium"} value={fmtMoney(totals.premium, 0)} />
        <RailTotal label="Collateral" value={fmtMoney(totals.collateral, 0)} />
        <RailTotal label="Blended ROI" value={fmtPct(blendedRoi, 2)} accent />
      </div>
      <button type="button" onClick={onClear} className="desk-meta shrink-0 px-2 text-ink-3 hover:text-ink">Clear</button>
    </div>
  );
}

function RailTotal({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <span className="min-w-20 px-3">
      <span className="desk-label block text-ink-3">{label}</span>
      <strong className={`num mt-0.5 block text-xs font-medium ${accent ? "text-teal" : "text-ink"}`}>{value}</strong>
    </span>
  );
}
