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
import { fmtDate, fmtDateTime, fmtMoney, fmtNum, fmtPct } from "@/lib/format";
import type { Strategy } from "@/lib/types";
import type { SortKey, SortState } from "@/components/screener-results";

type StatusScope = "all" | "actionable" | "gated" | "data-gaps";
type TierScope = "all" | OpportunityTier;

type TieredScannerWorkspaceProps = {
  strategy: Strategy;
  rows: ResearchRow[];
  done: boolean;
  emptyMessage: string;
  asOf: string | null;
  query: string;
  searchRef: RefObject<HTMLInputElement | null>;
  sector: string;
  sectors: string[];
  statusScope: StatusScope;
  sort: SortState;
  shortlist: Set<string>;
  shortlistRows: ResearchRow[];
  shortlistTotal: number;
  onQuery: (query: string) => void;
  onSector: (sector: string) => void;
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

const TIER_META: Array<{
  id: TierScope;
  desktop: string;
  mobile: string;
  definition: string;
}> = [
  {
    id: "all",
    desktop: "All",
    mobile: "All",
    definition: "Every contract that passed the active contract mandate.",
  },
  {
    id: "fallen-general",
    desktop: "Tier 1 · Fallen generals",
    mobile: "Fallen generals",
    definition:
      "At least 12% below the 52-week high, quality at least 55, peer valuation P50 or lower, and no worse than -12% over one month.",
  },
  {
    id: "quality-carry",
    desktop: "Tier 2 · Quality carry",
    mobile: "Quality carry",
    definition:
      "Quality at least 60, peer valuation P65 or lower, and at least 0.65x expected-move coverage.",
  },
  {
    id: "premium-rich",
    desktop: "Tier 3 · Premium-rich",
    mobile: "Premium-rich",
    definition:
      "Volatility-edge score at least 60, period ROI at least 2%, and execution score at least 45.",
  },
  {
    id: "watch",
    desktop: "Watch",
    mobile: "Watch",
    definition: "Passed the contract mandate but did not match a higher setup tier, or evidence is incomplete.",
  },
];

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

function statusLabel(status: UnderwriteStatus): string {
  return status === "GATED" ? "RISK FLAG" : status;
}

function statusTone(status: UnderwriteStatus): string {
  if (status === "ADVANCE") return "border-teal/55 bg-teal/10 text-teal";
  if (status === "GATED") return "border-coral/55 bg-coral/10 text-coral";
  return "border-amber/55 bg-amber/10 text-amber";
}

function tierLabel(tier: OpportunityTier): string {
  if (tier === "fallen-general") return "Fallen general";
  if (tier === "quality-carry") return "Quality carry";
  if (tier === "premium-rich") return "Premium-rich";
  return "Watch";
}

function tierTone(tier: OpportunityTier): string {
  if (tier === "fallen-general") return "border-teal/55 bg-teal/[0.07] text-teal";
  if (tier === "quality-carry") return "border-cyan/45 bg-cyan/[0.06] text-cyan";
  if (tier === "premium-rich") return "border-amber/55 bg-amber/[0.06] text-amber";
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

function evidenceFor(row: ResearchRow) {
  const coverage = row.research.expectedMoveCoverage;
  const riskFlags = unique([
    row.strategy === "csp"
      ? `Assignment loss begins below ${fmtMoney(row.breakeven)} at expiry`
      : `Share loss is measured from the displayed ${fmtMoney(row.spot)} basis`,
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
    row.ivRv === null ? "IV / realized-volatility comparison unavailable" : null,
    !row.eventDataAvailable ? "Forward event calendar unavailable" : null,
    row.high52w === null ? "Full trailing-high context unavailable" : null,
  ]);

  return {
    matched: row.research.opportunityReasons,
    risks: riskFlags.length > 0 ? riskFlags : ["No binding screen-level risk; complete ticker diligence"],
    missing: missing.length > 0 ? missing : ["No material screen-level data gaps"],
  };
}

export function TieredScannerWorkspace({
  strategy,
  rows,
  done,
  emptyMessage,
  asOf,
  query,
  searchRef,
  sector,
  sectors,
  statusScope,
  sort,
  shortlist,
  shortlistRows,
  shortlistTotal,
  onQuery,
  onSector,
  onStatusScope,
  onSort,
  onToggleShortlist,
  onClearShortlist,
}: TieredScannerWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tierScope, setTierScope] = useState<TierScope>("all");
  const [mobileView, setMobileView] = useState<"candidates" | "underwrite">("candidates");
  const [stressMultiple, setStressMultiple] = useState(1);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const storedSettings = useSyncExternalStore(
    subscribeToDeskSettings,
    getDeskSettingsSnapshot,
    getDeskSettingsServerSnapshot,
  );
  const deskSettings = useMemo(() => parseDeskSettings(storedSettings), [storedSettings]);

  const tierRows = useMemo(
    () =>
      tierScope === "all"
        ? rows
        : rows.filter((row) => row.research.opportunityTier === tierScope),
    [rows, tierScope],
  );
  const selected =
    tierRows.find((row) => row.occSymbol === selectedId) ?? tierRows[0] ?? null;
  const contracts = selected ? quantities[selected.occSymbol] ?? 1 : 1;

  const tierCounts = useMemo(() => {
    const counts: Record<TierScope, number> = {
      all: rows.length,
      "fallen-general": 0,
      "quality-carry": 0,
      "premium-rich": 0,
      watch: 0,
    };
    for (const row of rows) counts[row.research.opportunityTier] += 1;
    return counts;
  }, [rows]);

  function updateDeskSettings(next: DeskSettings) {
    try {
      localStorage.setItem(DESK_SETTINGS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(DESK_SETTINGS_EVENT));
    } catch {
      // Persistence is optional; current-session controls continue to work.
    }
  }

  function selectRow(row: ResearchRow) {
    setSelectedId(row.occSymbol);
  }

  function openSavedRow(row: ResearchRow) {
    setTierScope("all");
    setSelectedId(row.occSymbol);
    setMobileView("underwrite");
  }

  return (
    <section className="mt-3 min-w-0">
      <div className="mb-2 flex border-b border-edge bg-panel lg:hidden">
        <button
          type="button"
          onClick={() => setMobileView("candidates")}
          className={`relative flex h-12 flex-1 items-center justify-center gap-2 text-sm font-medium transition-colors ${
            mobileView === "candidates" ? "text-cyan" : "text-ink-2"
          }`}
        >
          Candidates
          {mobileView === "candidates" ? (
            <span className="absolute inset-x-4 bottom-0 h-px bg-cyan" />
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setMobileView("underwrite")}
          disabled={!selected}
          className={`relative flex h-12 flex-1 items-center justify-center gap-2 text-sm font-medium transition-colors disabled:opacity-40 ${
            mobileView === "underwrite" ? "text-cyan" : "text-ink-2"
          }`}
        >
          Underwrite
          {selected ? (
            <span className="num inline-grid h-5 min-w-5 place-items-center rounded-full border border-cyan px-1 text-[10px] text-cyan">
              1
            </span>
          ) : null}
          {mobileView === "underwrite" ? (
            <span className="absolute inset-x-4 bottom-0 h-px bg-cyan" />
          ) : null}
        </button>
      </div>

      <div className="grid min-w-0 items-start gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(32rem,1fr)]">
        <div className={`min-w-0 ${mobileView === "candidates" ? "block" : "hidden lg:block"}`}>
          <CandidateMatrix
            strategy={strategy}
            allRows={rows}
            rows={tierRows}
            done={done}
            emptyMessage={emptyMessage}
            selectedId={selected?.occSymbol ?? null}
            tierScope={tierScope}
            tierCounts={tierCounts}
            query={query}
            searchRef={searchRef}
            sector={sector}
            sectors={sectors}
            statusScope={statusScope}
            sort={sort}
            shortlist={shortlist}
            onTierScope={setTierScope}
            onQuery={onQuery}
            onSector={onSector}
            onStatusScope={onStatusScope}
            onSort={onSort}
            onSelect={selectRow}
            onOpenUnderwrite={() => setMobileView("underwrite")}
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
            onBack={() => setMobileView("candidates")}
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

function CandidateMatrix({
  strategy,
  allRows,
  rows,
  done,
  emptyMessage,
  selectedId,
  tierScope,
  tierCounts,
  query,
  searchRef,
  sector,
  sectors,
  statusScope,
  sort,
  shortlist,
  onTierScope,
  onQuery,
  onSector,
  onStatusScope,
  onSort,
  onSelect,
  onOpenUnderwrite,
  onToggleShortlist,
}: {
  strategy: Strategy;
  allRows: ResearchRow[];
  rows: ResearchRow[];
  done: boolean;
  emptyMessage: string;
  selectedId: string | null;
  tierScope: TierScope;
  tierCounts: Record<TierScope, number>;
  query: string;
  searchRef: RefObject<HTMLInputElement | null>;
  sector: string;
  sectors: string[];
  statusScope: StatusScope;
  sort: SortState;
  shortlist: Set<string>;
  onTierScope: (scope: TierScope) => void;
  onQuery: (query: string) => void;
  onSector: (sector: string) => void;
  onStatusScope: (scope: StatusScope) => void;
  onSort: (key: SortKey) => void;
  onSelect: (row: ResearchRow) => void;
  onOpenUnderwrite: () => void;
  onToggleShortlist: (row: ResearchRow) => void;
}) {
  const selected = rows.find((row) => row.occSymbol === selectedId) ?? rows[0] ?? null;
  const availableTiers =
    strategy === "csp"
      ? TIER_META
      : TIER_META.filter((tier) => tier.id !== "fallen-general");

  return (
    <div className="flex min-h-[38rem] w-full min-w-0 flex-col overflow-hidden border border-edge bg-panel">
      <nav
        aria-label="Setup tiers"
        className="scroller flex max-w-full shrink-0 overflow-x-auto border-b border-edge"
      >
        {availableTiers.map((tier) => {
          const active = tierScope === tier.id;
          return (
            <button
              key={tier.id}
              type="button"
              aria-pressed={active}
              title={tier.definition}
              onClick={() => onTierScope(tier.id)}
              className={`relative flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-xs font-medium leading-4 transition-colors xl:flex-1 xl:justify-center ${
                active ? "text-cyan" : "text-ink-2 hover:bg-panel-2 hover:text-ink"
              }`}
            >
              <span className="hidden sm:inline">{tier.desktop}</span>
              <span className="sm:hidden">{tier.mobile}</span>
              <span className="num text-[10px]">{tierCounts[tier.id]}</span>
              {active ? <span className="absolute inset-x-2 bottom-0 h-px bg-cyan" /> : null}
            </button>
          );
        })}
      </nav>

      <header className="grid min-w-0 grid-cols-2 gap-2 border-b border-edge px-3 py-2.5 sm:flex sm:flex-wrap sm:items-center">
        <label className="relative col-span-2 min-w-0 sm:min-w-48 sm:flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search ticker or company"
            aria-label="Search loaded candidates"
            className="h-9 w-full rounded border border-edge bg-panel-2 pl-8 pr-8 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-cyan/60"
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
        <select
          value={sector}
          onChange={(event) => onSector(event.target.value)}
          aria-label="Filter candidates by sector"
          className="h-9 w-full min-w-0 rounded border border-edge bg-panel-2 px-2.5 text-[13px] text-ink-2 outline-none focus:border-cyan/60 sm:max-w-44"
        >
          <option value="all">All sectors</option>
          {sectors.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <select
          value={statusScope}
          onChange={(event) => onStatusScope(event.target.value as StatusScope)}
          aria-label="Filter candidates by underwrite status"
          className="h-9 w-full min-w-0 rounded border border-edge bg-panel-2 px-2.5 text-[13px] text-ink-2 outline-none focus:border-cyan/60 sm:max-w-40"
        >
          <option value="all">All statuses</option>
          <option value="actionable">Advance / review</option>
          <option value="gated">Risk flagged</option>
          <option value="data-gaps">Data gaps</option>
        </select>
      </header>

      <div className="scroller hidden min-h-0 flex-1 overflow-auto lg:block lg:max-h-[66vh]">
        <table className="decision-table w-full min-w-[900px] border-collapse text-xs">
          <thead>
            <tr className="desk-label text-left text-ink-3">
              <DeskTh label="Ticker / price" sortKey="symbol" sort={sort} onSort={onSort} />
              <th className="px-2 py-2.5">Setup</th>
              <th className="px-2 py-2.5">Contract</th>
              <DeskTh label="Premium $" sortKey="premium" sort={sort} onSort={onSort} />
              <DeskTh
                label={strategy === "csp" ? "ROI on strike" : "ROI on shares"}
                sortKey="roi"
                sort={sort}
                onSort={onSort}
              />
              <th className="px-2 py-2.5">Breakeven</th>
              <DeskTh label="52w drop" sortKey="drawdown" sort={sort} onSort={onSort} />
              <DeskTh label="Quality / value" sortKey="quality" sort={sort} onSort={onSort} />
              <DeskTh label="Liquidity" sortKey="oi" sort={sort} onSort={onSort} />
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
                <td colSpan={10} className="px-5 py-20 text-center text-sm text-ink-3">
                  {done
                    ? tierScope === "all"
                      ? emptyMessage
                      : `No ${TIER_META.find((tier) => tier.id === tierScope)?.mobile.toLowerCase()} in the current result set.`
                    : "Scanning chains and ranking candidates…"}
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
            selected={row.occSymbol === selectedId}
            saved={shortlist.has(row.occSymbol)}
            onSelect={onSelect}
            onToggleShortlist={onToggleShortlist}
          />
        ))}
        {rows.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-ink-3">
            {done ? emptyMessage : "Scanning chains and ranking candidates…"}
          </p>
        ) : null}
      </div>

      <footer className="desk-meta flex items-center justify-between gap-2 border-t border-edge px-3 py-2 text-ink-3">
        <span>
          Showing <strong className="num font-medium text-ink">{rows.length}</strong> of {allRows.length} loaded
        </span>
        <span className="hidden lg:inline">Enter selects · / searches</span>
      </footer>

      {selected ? (
        <div className="sticky bottom-0 z-20 flex items-center gap-3 border-t border-edge-2 bg-panel/95 p-2.5 backdrop-blur lg:hidden">
          <p className="min-w-0 flex-1 truncate text-xs text-ink-2">
            Selected: <strong className="text-cyan">{selected.symbol}</strong>{" "}
            <span className="num">{fmtMoney(selected.strike, 0)} {selected.strategy === "csp" ? "put" : "call"}</span>
          </p>
          <button
            type="button"
            onClick={onOpenUnderwrite}
            className="inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded bg-cyan px-4 text-sm font-semibold text-black"
          >
            <ShieldAlert className="h-4 w-4" /> Underwrite
          </button>
        </div>
      ) : null}
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
        <span className="block font-semibold text-ink">{row.symbol}</span>
        <span className="desk-meta num mt-0.5 block text-ink-3">{fmtMoney(row.spot)}</span>
      </td>
      <td className="px-2 py-2.5">
        <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium leading-4 ${tierTone(row.research.opportunityTier)}`}>
          {tierLabel(row.research.opportunityTier)}
        </span>
        <span className={`mt-1 block text-[10px] font-medium leading-4 ${row.research.status === "GATED" ? "text-coral" : row.research.status === "ADVANCE" ? "text-teal" : "text-amber"}`}>
          {statusLabel(row.research.status)} · UW {row.research.underwriteScore ?? "—"}
        </span>
      </td>
      <td className="px-2 py-2.5">
        <span className="num block font-medium text-ink">{fmtMoney(row.strike, 0)} {row.strategy === "csp" ? "put" : "call"}</span>
        <span className="desk-meta num mt-0.5 block text-ink-3">{fmtDate(row.expiration)} · {row.dte}d · Δ {Math.abs(row.delta ?? 0).toFixed(2)}</span>
      </td>
      <td className="num px-2 py-2.5">
        <span className="block text-[13px] font-medium leading-5 text-ink">{fmtMoney(row.premium, 0)}</span>
        <span className="desk-meta mt-0.5 block text-ink-3">{fmtMoney(bidPremium(row), 0)} bid</span>
      </td>
      <td className="num px-2 py-2.5">
        <span className="block text-[13px] font-medium leading-5 text-cyan">{fmtPct(row.roc, 2)}</span>
        <span className="desk-meta mt-0.5 block text-ink-3">{fmtPct(row.rocAnnualized)} ann.</span>
      </td>
      <td className="num px-2 py-2.5">
        <span className="block text-ink">{fmtMoney(row.breakeven)}</span>
        <span className="desk-meta mt-0.5 block text-ink-3">{fmtPct(row.research.riskBufferPct)} buffer</span>
      </td>
      <td className="num px-2 py-2.5">
        <span className={row.drawdown52w === null ? "text-ink-3" : "text-coral"}>
          {row.drawdown52w === null ? "—" : `${(row.drawdown52w * 100).toFixed(1)}%`}
        </span>
        <span className="desk-meta mt-0.5 block text-ink-3">1m {signedPct(row.return1m)}</span>
      </td>
      <td className="num px-2 py-2.5">
        <span className="text-teal">{row.research.qualityScore ?? "—"}</span>
        <span className="text-ink-3"> / </span>
        <span className="text-ink">{row.research.valuationPercentile === null ? "—" : `P${row.research.valuationPercentile}`}</span>
        <span className="desk-meta mt-0.5 block text-ink-3">{row.research.confidence}% conf.</span>
      </td>
      <td className="px-2 py-2.5">
        <span className="block text-xs text-ink">OI {fmtNum(row.openInterest)}</span>
        <span className={`desk-meta num mt-0.5 block ${(row.spreadPct ?? 0) > 0.12 ? "text-amber" : "text-ink-3"}`}>
          {fmtPct(row.spreadPct, 0)} spread
        </span>
        <CompactEvent row={row} />
      </td>
      <td className="px-2 py-2.5">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleShortlist(row);
          }}
          aria-label={`${saved ? "Remove" : "Save"} ${row.symbol} ${row.strike} ${row.strategy === "csp" ? "put" : "call"} ${saved ? "from" : "to"} shortlist`}
          aria-pressed={saved}
          className={`rounded p-1 transition-colors ${saved ? "text-cyan" : "text-ink-3 hover:text-ink"}`}
        >
          <Star className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
        </button>
      </td>
    </tr>
  );
}

function MobileCandidateRow({
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
    <article
      tabIndex={0}
      data-selected={selected ? "true" : "false"}
      onClick={() => onSelect(row)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(row);
        }
      }}
      className={`cursor-pointer px-3 py-3 transition-colors ${
        selected ? "bg-cyan/[0.055] shadow-[inset_2px_0_0_var(--color-cyan)]" : "bg-desk"
      }`}
    >
      <header className="flex items-start gap-2">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleShortlist(row);
          }}
          aria-label={`${saved ? "Remove" : "Save"} ${row.symbol} from shortlist`}
          className={`mt-0.5 rounded p-1 ${saved ? "text-cyan" : "text-ink-3"}`}
        >
          <Star className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <strong className="text-base text-ink">{row.symbol}</strong>
            <span className="num text-[10px] text-ink-3">{fmtMoney(row.spot)}</span>
            <span className={`inline-flex rounded border px-1.5 py-0.5 text-[9px] ${tierTone(row.research.opportunityTier)}`}>
              {tierLabel(row.research.opportunityTier)}
            </span>
          </div>
          <p className="num mt-1 text-[10px] text-ink-2">
            {fmtMoney(row.strike, 0)} {row.strategy === "csp" ? "put" : "call"} · {fmtDate(row.expiration)} · {row.dte} DTE · Δ {Math.abs(row.delta ?? 0).toFixed(2)}
          </p>
        </div>
        <span className={`text-[9px] font-medium ${row.research.status === "GATED" ? "text-coral" : row.research.status === "ADVANCE" ? "text-teal" : "text-amber"}`}>
          {statusLabel(row.research.status)}
        </span>
      </header>

      <div className="mt-3 grid grid-cols-3 divide-x divide-edge border-y border-edge">
        <MobileMetric
          label="Premium @ mid"
          value={fmtMoney(row.premium, 0)}
          detail={`${fmtMoney(bidPremium(row), 0)} bid`}
          accent
        />
        <MobileMetric
          label={row.strategy === "csp" ? "ROI on strike" : "ROI on shares"}
          value={fmtPct(row.roc, 2)}
          detail={`${fmtPct(row.rocAnnualized)} ann.`}
          accent
        />
        <MobileMetric
          label="52w drop"
          value={row.drawdown52w === null ? "—" : `${(row.drawdown52w * 100).toFixed(1)}%`}
          detail={`1m ${signedPct(row.return1m)}`}
          risk={row.drawdown52w !== null}
        />
      </div>

      <footer className="mt-2 grid grid-cols-3 gap-2 text-[9px] text-ink-3">
        <span>Breakeven <strong className="num block text-[10px] font-medium text-ink">{fmtMoney(row.breakeven)}</strong></span>
        <span>Quality / value <strong className="num block text-[10px] font-medium text-ink">{row.research.qualityScore ?? "—"} / {row.research.valuationPercentile === null ? "—" : `P${row.research.valuationPercentile}`}</strong></span>
        <span>Liquidity <strong className="num block text-[10px] font-medium text-ink">OI {fmtNum(row.openInterest)}</strong></span>
      </footer>
    </article>
  );
}

function MobileMetric({
  label,
  value,
  detail,
  accent = false,
  risk = false,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
  risk?: boolean;
}) {
  return (
    <div className="min-w-0 px-2 py-2.5 first:pl-0 last:pr-0">
      <span className="block truncate text-[8px] uppercase tracking-[0.06em] text-ink-3">{label}</span>
      <strong className={`num mt-1 block truncate text-base font-medium ${risk ? "text-coral" : accent ? "text-cyan" : "text-ink"}`}>{value}</strong>
      <span className="num mt-0.5 block truncate text-[9px] text-ink-3">{detail}</span>
    </div>
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

function CompactEvent({ row }: { row: ResearchRow }) {
  if (!row.eventDataAvailable) return <span className="mt-0.5 block text-[10px] leading-4 text-amber">EVENT GAP</span>;
  if (row.earningsStatus === "in-window") return <span className="mt-0.5 block text-[10px] leading-4 text-amber">EARN {fmtDate(row.earningsDate)}</span>;
  if (row.earningsStatus === "unknown") return <span className="mt-0.5 block text-[10px] leading-4 text-amber">EARN UNKNOWN</span>;
  return <span className="mt-0.5 block text-[10px] leading-4 text-teal">NO KNOWN EARNINGS</span>;
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
      <div className="flex min-h-96 items-center justify-center border border-dashed border-edge-2 bg-panel/60 p-8 text-center">
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

  const expectedMove = expectedMoveFor(row);
  const scenarioPrice = Math.max(0, row.spot * (1 - stressMultiple * expectedMove));
  const scenarioPnl = expiryPnlPerContract(row, scenarioPrice) * contracts;
  const collateralPerContract = (row.strategy === "csp" ? row.strike : row.spot) * 100;
  const collateral = collateralPerContract * contracts;
  const totalPremium = row.premium * contracts;
  const allocationPct = collateral / Math.max(deskSettings.accountCash, 1);
  const positionLimit = deskSettings.accountCash * deskSettings.maxPositionPct;
  const maxContracts = Math.floor(positionLimit / Math.max(collateralPerContract, 1));
  const outsideBy = Math.max(0, collateral - positionLimit);
  const evidence = evidenceFor(row);

  return (
    <article className="w-full min-w-0 overflow-hidden border border-edge bg-panel lg:sticky lg:top-[4.25rem] lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
      <header className="border-b border-edge px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="mb-2 inline-flex h-9 items-center gap-1 text-xs text-ink-2 lg:hidden"
        >
          <ChevronLeft className="h-4 w-4" /> Candidates
        </button>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold leading-5 tracking-[-0.02em] text-ink">
              {row.symbol} · {fmtMoney(row.strike, 0)} {row.strategy === "csp" ? "put" : "call"} · {fmtDate(row.expiration)}
              <span className="desk-meta ml-1 font-normal tracking-normal text-ink-3">· {row.dte} DTE</span>
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex rounded border px-2 py-1 text-[10px] font-medium leading-4 ${tierTone(row.research.opportunityTier)}`}>
                {row.strategy === "csp" && row.research.opportunityTier !== "watch" ? `Tier ${row.research.opportunityTier === "fallen-general" ? 1 : row.research.opportunityTier === "quality-carry" ? 2 : 3} · ` : ""}{tierLabel(row.research.opportunityTier)}
              </span>
              <span className={`inline-flex rounded border px-2 py-1 text-[10px] font-semibold leading-4 ${statusTone(row.research.status)}`}>
                {statusLabel(row.research.status)}
              </span>
              <span className="desk-meta num text-ink-3">
                UW {row.research.underwriteScore ?? "—"} · {row.research.confidence}% confidence
              </span>
            </div>
          </div>
          <Link
            href={`/ticker/${row.symbol}`}
            aria-label={`Open ${row.symbol} ticker workbench`}
            className="rounded border border-edge p-1.5 text-ink-3 transition-colors hover:bg-panel-2 hover:text-ink"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <section aria-label="Contract economics" className="border-b border-edge">
        <div className="grid grid-cols-2 divide-x divide-edge border-b border-edge sm:grid-cols-4">
          <HeroMetric label="Premium @ mid" value={fmtMoney(totalPremium, 0)} accent />
          <HeroMetric label={row.strategy === "csp" ? "ROI on strike" : "ROI on shares"} value={fmtPct(row.roc, 2)} accent />
          <HeroMetric label="Collateral" value={fmtMoney(collateral, 0)} />
          <HeroMetric label="Breakeven" value={fmtMoney(row.breakeven)} />
        </div>
        <div className="grid grid-cols-2 gap-2 px-3 py-2.5 sm:grid-cols-[auto_1fr_1fr_1fr_1fr] sm:items-end">
          <QuantityStepper value={contracts} onChange={onContracts} />
          <SmallDatum label="Bid floor" value={fmtMoney(bidPremium(row, contracts), 0)} detail={row.bid === null ? "—" : `${row.bid.toFixed(2)} x ${contracts * 100}`} />
          <SmallDatum label="Mid" value={fmtMoney(totalPremium, 0)} detail={`${row.mid.toFixed(2)} x ${contracts * 100}`} />
          <SmallDatum label="Ask" value={fmtMoney(askPremium(row, contracts), 0)} detail={row.ask === null ? "—" : `${row.ask.toFixed(2)} x ${contracts * 100}`} />
          <SmallDatum label="Spread" value={fmtMoney((row.ask ?? row.mid) * 100 - (row.bid ?? row.mid) * 100, 0)} detail={fmtPct(row.spreadPct)} />
        </div>
        <p className="desk-meta border-t border-edge px-3 py-2 text-center text-ink-3">
          {row.strategy === "csp" ? "ROI = premium ÷ strike collateral" : "ROI = premium ÷ current share value"} · midpoint is not a guaranteed fill
        </p>
      </section>

      <InspectorSection title="Price & setup">
        <PriceSetupRail row={row} />
      </InspectorSection>

      <InspectorSection title="Capital sizing">
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
        <div className="px-3 pb-3">
          <div className="relative h-1.5 rounded-full bg-edge-2">
            <span
              className={`absolute inset-y-0 left-0 rounded-full ${outsideBy > 0 ? "bg-coral" : "bg-teal"}`}
              style={{ width: `${Math.min(100, allocationPct * 100)}%` }}
            />
            <span
              className="absolute -top-1 h-3.5 w-px bg-ink"
              style={{ left: `${Math.min(100, deskSettings.maxPositionPct * 100)}%` }}
            />
          </div>
          <div className="desk-meta mt-1 flex justify-between text-ink-3">
            <span>$0</span>
            <span>{fmtPct(deskSettings.maxPositionPct, 0)} limit</span>
            <span>{fmtMoney(deskSettings.accountCash, 0)}</span>
          </div>
          <p className={`desk-meta mt-2 flex items-center gap-2 border px-2.5 py-2 ${outsideBy > 0 ? "border-coral/60 bg-coral/[0.05] text-coral" : "border-teal/50 bg-teal/[0.05] text-teal"}`}>
            {outsideBy > 0 ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {outsideBy > 0
              ? `Outside the position limit by ${fmtMoney(outsideBy, 0)}`
              : `${fmtMoney(positionLimit - collateral, 0)} of position headroom remains · premium ${fmtMoney(totalPremium, 0)}`}
          </p>
        </div>
      </InspectorSection>

      <InspectorSection
        title="Stress at expiry"
        action={
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
        }
      >
        <div className="border-y border-edge bg-desk/50 px-2 pb-1 pt-2">
          <div className="desk-meta mb-1 flex flex-wrap items-center justify-between gap-2 px-1 text-ink-3">
            <span>Scenario price <strong className="num ml-1 font-medium text-ink">{fmtMoney(scenarioPrice)}</strong></span>
            <span>Expiry P/L <strong className={`num ml-1 font-medium ${scenarioPnl < 0 ? "text-coral" : "text-teal"}`}>{fmtMoney(scenarioPnl, 0)}</strong></span>
          </div>
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
      </InspectorSection>

      <EvidenceGrid evidence={evidence} />

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

      <div className="flex flex-wrap justify-between gap-2 border-t border-edge px-3 py-2 text-[10px] leading-4 text-ink-3">
        <span>Cboe delayed chain · {fmtDateTime(row.chainAsOf)}</span>
        <span>
          {row.fundamentals.source === "nasdaq" ? "Nasdaq reported fundamentals" : row.fundamentals.note ?? "Fundamentals unavailable"}
          {row.priceHistorySource ? ` · ${row.priceHistorySource.toUpperCase()} ${row.priceHistoryObservations}d history` : " · price history unavailable"}
          {asOf ? ` · freeze ${fmtDateTime(asOf)}` : ""}
        </span>
      </div>
    </article>
  );
}

function HeroMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0 px-3 py-3.5 text-center">
      <strong className={`num block truncate text-lg font-medium leading-6 ${accent ? "text-cyan" : "text-ink"}`}>{value}</strong>
      <span className="desk-meta mt-1 block truncate text-ink-3">{label}</span>
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

function InspectorSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-edge">
      <header className="flex min-h-10 items-center gap-2 px-3 py-2">
        <h3 className="desk-section-title text-ink">{title}</h3>
        {action ? <div className="ml-auto">{action}</div> : null}
      </header>
      {children}
    </section>
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

function EvidenceGrid({ evidence }: { evidence: ReturnType<typeof evidenceFor> }) {
  const groups = [
    { title: "Why it matched", items: evidence.matched, tone: "teal" as const, icon: CheckCircle2 },
    { title: "Risk flags", items: evidence.risks, tone: "coral" as const, icon: AlertTriangle },
    { title: "Data gaps", items: evidence.missing, tone: "muted" as const, icon: CircleHelp },
  ];

  return (
    <>
      <div className="hidden grid-cols-3 divide-x divide-edge border-b border-edge lg:grid">
        {groups.map((group) => (
          <EvidenceColumn key={group.title} {...group} />
        ))}
      </div>
      <div className="divide-y divide-edge border-b border-edge lg:hidden">
        {groups.map((group, index) => (
          <details key={group.title} open={index === 0} className="group">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-3 py-3 [&::-webkit-details-marker]:hidden">
              <group.icon className={`h-4 w-4 ${group.tone === "teal" ? "text-teal" : group.tone === "coral" ? "text-coral" : "text-ink-2"}`} />
              <span className="text-xs font-semibold text-ink">{group.title}</span>
              <span className="num text-[10px] text-ink-3">({group.items.length})</span>
              <ChevronDown className="ml-auto h-4 w-4 text-ink-3 transition-transform group-open:rotate-180" />
            </summary>
            <ul className="space-y-1.5 px-9 pb-3 text-[10px] leading-relaxed text-ink-2">
              {group.items.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </details>
        ))}
      </div>
    </>
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
