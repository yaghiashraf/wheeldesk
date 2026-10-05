"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ExternalLink,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Star,
  X,
} from "lucide-react";
import {
  useMemo,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { fmtDate, fmtDateTime, fmtMoney, fmtNum, fmtPct } from "@/lib/format";
import type { ResearchRow, UnderwriteStatus } from "@/lib/research";
import type { Strategy } from "@/lib/types";
import type { SortKey, SortState } from "@/components/screener-results";

type StatusScope = "all" | "actionable" | "gated" | "data-gaps";

type DecisionDeskWorkspaceProps = {
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
    // Fall through to the transparent desk defaults.
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

function unique(items: Array<string | null | undefined>): string[] {
  return [...new Set(items.filter((item): item is string => Boolean(item)))];
}

function expectedMoveFor(row: ResearchRow): number {
  if (row.research.expectedMovePct !== null) return row.research.expectedMovePct;
  if (row.iv !== null) return row.iv * Math.sqrt(row.dte / 365);
  return 0.08;
}

function expiryPnl(row: ResearchRow, expiryPrice: number): number {
  if (row.strategy === "csp") {
    return row.premium - Math.max(row.strike - expiryPrice, 0) * 100;
  }
  // Covered-call scans do not carry a portfolio lot basis. The desk therefore
  // uses current spot as the explicit comparison basis for this scenario view.
  return (Math.min(expiryPrice, row.strike) - row.spot) * 100 + row.premium;
}

function evidenceFor(row: ResearchRow) {
  const coverage = row.research.expectedMoveCoverage;
  const survives = unique([
    coverage === null ? null : `Buffer covers ${coverage.toFixed(2)}× expected move`,
    `Period ROC ${fmtPct(row.roc)} · ${fmtPct(row.rocAnnualized)} annualized`,
    row.spreadPct === null ? null : `Spread ${fmtPct(row.spreadPct)} · ${fmtNum(row.openInterest)} open interest`,
    row.earningsStatus === "clear" ? "Calendar confirms no earnings before expiry" : null,
    row.research.valuationPercentile !== null
      ? `${row.research.valuationLabel} · peer percentile ${Math.round(row.research.valuationPercentile)}`
      : null,
  ]);

  const breaks = unique([
    row.strategy === "csp"
      ? `Underlying closes below ${fmtMoney(row.breakeven)} at expiry`
      : `Shares fall below the ${fmtMoney(row.spot)} scenario basis`,
    row.research.status === "ADVANCE" ? null : row.research.bindingRisk,
    coverage !== null && coverage < 1
      ? `Buffer covers less than one expected move (${coverage.toFixed(2)}×)`
      : "Volatility expands beyond the entry reference",
    row.earningsStatus === "in-window" ? `Earnings ${fmtDate(row.earningsDate)} inside the trade window` : null,
    row.research.valuationPercentile !== null && row.research.valuationPercentile > 80
      ? `Effective entry remains expensive versus peers (P${Math.round(row.research.valuationPercentile)})`
      : null,
  ]);

  const missing = unique([
    ...row.research.missingEvidence,
    row.earningsStatus === "unknown" ? "No earnings date confirmed" : null,
    row.research.peerCount < 3 ? "Peer set too thin for a stable percentile" : null,
    row.ivRv === null ? "IV / realized-volatility comparison unavailable" : null,
    !row.eventDataAvailable ? "Forward event calendar unavailable" : null,
  ]);

  return {
    survives: survives.length > 0 ? survives : ["Contract passed every active hard mandate gate"],
    breaks,
    missing: missing.length > 0 ? missing : ["No material screen-level evidence gaps"],
  };
}

export function DecisionDeskWorkspace({
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
}: DecisionDeskWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"candidates" | "underwrite">("underwrite");
  const [stressMultiple, setStressMultiple] = useState(1);
  const storedSettings = useSyncExternalStore(
    subscribeToDeskSettings,
    getDeskSettingsSnapshot,
    getDeskSettingsServerSnapshot,
  );
  const deskSettings = useMemo(() => parseDeskSettings(storedSettings), [storedSettings]);

  function updateDeskSettings(next: DeskSettings) {
    try {
      localStorage.setItem(DESK_SETTINGS_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(DESK_SETTINGS_EVENT));
    } catch {
      // Persistence is an enhancement; no research state depends on it.
    }
  }

  const selected = rows.find((row) => row.occSymbol === selectedId) ?? rows[0] ?? null;

  function selectRow(row: ResearchRow) {
    setSelectedId(row.occSymbol);
    setMobileView("underwrite");
  }

  return (
    <section className="mt-3">
      <div className="mb-2 flex rounded-lg border border-edge bg-panel lg:hidden">
        <button
          type="button"
          onClick={() => setMobileView("candidates")}
          className={`relative flex h-11 flex-1 items-center justify-center gap-2 text-sm font-medium transition-colors ${
            mobileView === "candidates" ? "text-cyan" : "text-ink-2"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Candidates
          {mobileView === "candidates" ? <span className="absolute inset-x-4 bottom-0 h-px bg-cyan" /> : null}
        </button>
        <button
          type="button"
          onClick={() => setMobileView("underwrite")}
          disabled={!selected}
          className={`relative flex h-11 flex-1 items-center justify-center gap-2 text-sm font-medium transition-colors disabled:opacity-40 ${
            mobileView === "underwrite" ? "text-cyan" : "text-ink-2"
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          Underwrite
          {mobileView === "underwrite" ? <span className="absolute inset-x-4 bottom-0 h-px bg-cyan" /> : null}
        </button>
      </div>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.58fr)_minmax(31rem,1fr)]">
        <div className={mobileView === "candidates" ? "block" : "hidden lg:block"}>
          <CandidateMatrix
            rows={rows}
            done={done}
            emptyMessage={emptyMessage}
            selectedId={selected?.occSymbol ?? null}
            query={query}
            searchRef={searchRef}
            sector={sector}
            sectors={sectors}
            statusScope={statusScope}
            sort={sort}
            shortlist={shortlist}
            onQuery={onQuery}
            onSector={onSector}
            onStatusScope={onStatusScope}
            onSort={onSort}
            onSelect={selectRow}
            onToggleShortlist={onToggleShortlist}
          />
        </div>

        <div className={mobileView === "underwrite" ? "block" : "hidden lg:block"}>
          <UnderwriteInspector
            row={selected}
            asOf={asOf}
            deskSettings={deskSettings}
            stressMultiple={stressMultiple}
            saved={selected ? shortlist.has(selected.occSymbol) : false}
            onDeskSettings={updateDeskSettings}
            onStressMultiple={setStressMultiple}
            onSave={() => {
              if (selected) onToggleShortlist(selected);
            }}
            onBack={() => setMobileView("candidates")}
          />
        </div>
      </div>

      <DeskTray
        strategy={strategy}
        rows={shortlistRows}
        total={shortlistTotal}
        onSelect={selectRow}
        onRemove={onToggleShortlist}
        onClear={onClearShortlist}
      />
    </section>
  );
}

function CandidateMatrix({
  rows,
  done,
  emptyMessage,
  selectedId,
  query,
  searchRef,
  sector,
  sectors,
  statusScope,
  sort,
  shortlist,
  onQuery,
  onSector,
  onStatusScope,
  onSort,
  onSelect,
  onToggleShortlist,
}: {
  rows: ResearchRow[];
  done: boolean;
  emptyMessage: string;
  selectedId: string | null;
  query: string;
  searchRef: RefObject<HTMLInputElement | null>;
  sector: string;
  sectors: string[];
  statusScope: StatusScope;
  sort: SortState;
  shortlist: Set<string>;
  onQuery: (query: string) => void;
  onSector: (sector: string) => void;
  onStatusScope: (scope: StatusScope) => void;
  onSort: (key: SortKey) => void;
  onSelect: (row: ResearchRow) => void;
  onToggleShortlist: (row: ResearchRow) => void;
}) {
  return (
    <div className="flex min-h-[38rem] flex-col overflow-hidden rounded-lg border border-edge bg-panel">
      <header className="flex flex-wrap items-center gap-2 border-b border-edge px-3 py-2.5">
        <div className="mr-auto flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-ink">Mandate survivors</h2>
          <span className="num text-[10px] text-cyan">{rows.length} loaded</span>
        </div>
        <label className="relative min-w-48 flex-1 sm:max-w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Search survivors…"
            aria-label="Search loaded mandate survivors"
            className="h-8 w-full rounded border border-edge bg-panel-2 pl-8 pr-7 text-xs text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-cyan/60"
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
          aria-label="Filter survivors by sector"
          className="h-8 max-w-40 rounded border border-edge bg-panel-2 px-2 text-xs text-ink-2 outline-none focus:border-cyan/60"
        >
          <option value="all">All sectors</option>
          {sectors.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select
          value={statusScope}
          onChange={(event) => onStatusScope(event.target.value as StatusScope)}
          aria-label="Filter survivors by status"
          className="h-8 max-w-44 rounded border border-edge bg-panel-2 px-2 text-xs text-ink-2 outline-none focus:border-cyan/60"
        >
          <option value="all">All statuses</option>
          <option value="actionable">Advance / review</option>
          <option value="gated">Risk flagged</option>
          <option value="data-gaps">Data gaps</option>
        </select>
      </header>

      <div className="scroller min-h-0 flex-1 overflow-auto lg:max-h-[67vh]">
        <table className="decision-table w-full min-w-[860px] border-collapse text-xs">
          <thead>
            <tr className="text-left text-[9px] font-medium uppercase tracking-[0.12em] text-ink-3">
              <th className="w-10 px-3 py-2.5">#</th>
              <DeskTh label="Ticker" sortKey="symbol" sort={sort} onSort={onSort} />
              <th className="px-3 py-2.5">Status</th>
              <DeskTh label="Underwrite" sortKey="underwrite" sort={sort} onSort={onSort} />
              <th className="px-3 py-2.5">Contract</th>
              <DeskTh label="Period ROC" sortKey="annualized" sort={sort} onSort={onSort} />
              <DeskTh label="Buffer / move" sortKey="buffer" sort={sort} onSort={onSort} />
              <DeskTh label="Spread" sortKey="spread" sort={sort} onSort={onSort} />
              <DeskTh label="OI" sortKey="oi" sort={sort} onSort={onSort} />
              <th className="px-3 py-2.5">Events</th>
              <th className="w-8 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const selected = row.occSymbol === selectedId;
              const saved = shortlist.has(row.occSymbol);
              return (
                <tr
                  key={row.occSymbol}
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
                  <td className="num px-3 py-3 text-ink-3">{index + 1}</td>
                  <td className="px-3 py-3">
                    <span className="block font-semibold text-ink">{row.symbol}</span>
                    <span className="mt-0.5 block max-w-24 truncate text-[9px] text-ink-3">{row.name}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded border px-1.5 py-1 text-[9px] font-semibold tracking-wide ${statusTone(row.research.status)}`}>
                      {statusLabel(row.research.status)}
                    </span>
                  </td>
                  <td className="num px-3 py-3">
                    <span className={row.research.underwriteScore === null ? "text-ink-3" : "text-cyan"}>
                      {row.research.underwriteScore ?? "—"}
                    </span>
                    <span className="mt-0.5 block text-[9px] text-ink-3">{row.research.confidence}% conf.</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="num block font-medium text-ink">{fmtMoney(row.strike, 0)} {row.strategy === "csp" ? "put" : "call"}</span>
                    <span className="num mt-0.5 block text-[9px] text-ink-3">{fmtDate(row.expiration)} · {row.dte}d</span>
                  </td>
                  <td className="num px-3 py-3 text-teal">
                    <span className="block">{fmtPct(row.roc)}</span>
                    <span className="mt-0.5 block text-[9px] text-ink-3">{fmtPct(row.rocAnnualized)} ann.</span>
                  </td>
                  <td className="num px-3 py-3">
                    <span className={(row.research.expectedMoveCoverage ?? 0) < 0.75 ? "text-coral" : "text-ink"}>
                      {row.research.expectedMoveCoverage === null ? "—" : `${row.research.expectedMoveCoverage.toFixed(2)}×`}
                    </span>
                    <span className="mt-0.5 block text-[9px] text-ink-3">{fmtPct(row.research.riskBufferPct)}</span>
                  </td>
                  <td className={`num px-3 py-3 ${(row.spreadPct ?? 0) > 0.12 ? "text-amber" : "text-ink"}`}>
                    {fmtPct(row.spreadPct, 0)}
                  </td>
                  <td className="num px-3 py-3 text-ink-2">{fmtNum(row.openInterest)}</td>
                  <td className="px-3 py-3"><CompactEvents row={row} /></td>
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleShortlist(row);
                      }}
                      aria-label={`${saved ? "Remove" : "Save"} ${row.symbol} ${row.strike} ${row.strategy === "csp" ? "put" : "call"} ${saved ? "from" : "to"} desk`}
                      aria-pressed={saved}
                      className={`rounded p-1 transition-colors ${saved ? "text-cyan" : "text-ink-3 hover:text-ink"}`}
                    >
                      <Star className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-5 py-20 text-center text-sm text-ink-3">
                  {done ? emptyMessage : "Scanning chains and underwriting mandate survivors…"}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <footer className="flex items-center justify-between border-t border-edge px-3 py-2 text-[10px] text-ink-3">
        <span>Showing {rows.length} survivor{rows.length === 1 ? "" : "s"}</span>
        <span>Enter selects · / searches</span>
      </footer>
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
    <th aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined} className="px-3 py-2.5">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 uppercase tracking-[0.12em] transition-colors hover:text-ink ${active ? "text-cyan" : ""}`}
      >
        {label}
        {active ? <ChevronDown className={`h-3 w-3 ${sort.direction === "asc" ? "rotate-180" : ""}`} /> : null}
      </button>
    </th>
  );
}

function CompactEvents({ row }: { row: ResearchRow }) {
  if (!row.eventDataAvailable) return <span className="text-[9px] text-amber">GAP</span>;
  if (row.earningsStatus === "in-window") return <span className="text-[9px] text-amber">EARN {fmtDate(row.earningsDate)}</span>;
  if (row.earningsStatus === "unknown") return <span className="text-[9px] text-amber">UNKNOWN</span>;
  return <Check className="h-3.5 w-3.5 text-teal" aria-label="No confirmed earnings before expiry" />;
}

function UnderwriteInspector({
  row,
  asOf,
  deskSettings,
  stressMultiple,
  saved,
  onDeskSettings,
  onStressMultiple,
  onSave,
  onBack,
}: {
  row: ResearchRow | null;
  asOf: string | null;
  deskSettings: DeskSettings;
  stressMultiple: number;
  saved: boolean;
  onDeskSettings: (settings: DeskSettings) => void;
  onStressMultiple: (value: number) => void;
  onSave: () => void;
  onBack: () => void;
}) {
  if (!row) {
    return (
      <div className="flex min-h-96 items-center justify-center rounded-lg border border-dashed border-edge-2 bg-panel/60 p-8 text-center">
        <div className="max-w-xs">
          <ShieldAlert className="mx-auto h-6 w-6 text-cyan" strokeWidth={1.5} />
          <h2 className="mt-3 text-sm font-semibold">No contract selected</h2>
          <p className="mt-2 text-xs leading-relaxed text-ink-2">Run the mandate or select a survivor to build its capital and stress underwrite.</p>
          <button type="button" onClick={onBack} className="mt-4 text-xs font-medium text-cyan lg:hidden">View candidates</button>
        </div>
      </div>
    );
  }

  const expectedMove = expectedMoveFor(row);
  const stressMovePct = -stressMultiple * expectedMove;
  const scenarioPrice = Math.max(0, row.spot * (1 + stressMovePct));
  const scenarioPnl = expiryPnl(row, scenarioPrice);
  const cashRequired = row.strategy === "csp" ? row.strike * 100 : row.spot * 100;
  const allocationPct = cashRequired / Math.max(deskSettings.accountCash, 1);
  const positionLimit = deskSettings.accountCash * deskSettings.maxPositionPct;
  const outsideBy = Math.max(0, cashRequired - positionLimit);
  const evidence = evidenceFor(row);

  return (
    <article className="overflow-hidden rounded-lg border border-edge bg-panel lg:sticky lg:top-[4.25rem]">
      <header className="border-b border-edge">
        <div className="flex items-start justify-between gap-3 px-3 py-2">
          <div className="min-w-0">
            <button type="button" onClick={onBack} className="mb-2 inline-flex items-center gap-1 text-[10px] text-cyan lg:hidden">
              <ChevronRight className="h-3 w-3 rotate-180" /> Candidates
            </button>
            <h2 className="truncate text-sm font-semibold tracking-tight text-ink">
              {row.symbol} · {fmtMoney(row.strike, 0)} {row.strategy === "csp" ? "put" : "call"} · {fmtDate(row.expiration)}
              <span className="ml-1 text-xs font-normal text-ink-3">({row.dte} DTE)</span>
            </h2>
          </div>
          <Link
            href={`/ticker/${row.symbol}`}
            aria-label={`Open ${row.symbol} workbench`}
            className="rounded border border-edge p-1.5 text-ink-3 transition-colors hover:bg-panel-2 hover:text-ink"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-[1fr_1fr_.8fr] border-t border-edge">
          <div className="px-3 py-2.5">
            <span className={`inline-flex rounded border px-2 py-1 text-[10px] font-semibold tracking-wide ${statusTone(row.research.status)}`}>
              {statusLabel(row.research.status)}
            </span>
          </div>
          <Metric label="Underwrite score" value={row.research.underwriteScore === null ? "—" : `${row.research.underwriteScore} / 100`} accent />
          <Metric label="Confidence" value={`${row.research.confidence}%`} />
        </div>
      </header>

      <InspectorSection number="1" title="Economics">
        <div className="grid grid-cols-3 border-y border-edge sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
          <Metric label="Collect" value={fmtMoney(row.premium, 0)} />
          <Metric label="Breakeven" value={fmtMoney(row.breakeven)} />
          <Metric label="Cash required" value={fmtMoney(cashRequired, 0)} />
          <Metric label="Period ROC" value={fmtPct(row.roc)} accent />
          <Metric label="Annualized" value={fmtPct(row.rocAnnualized)} />
          <Metric label="Model P(ITM)" value={fmtPct(row.pItm, 0)} />
        </div>
      </InspectorSection>

      <InspectorSection number="2" title="Capital permission">
        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 px-3 pb-3">
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
          <div className="pb-1 text-right">
            <span className="block text-[9px] text-ink-3">Allocation if assigned</span>
            <span className={`num mt-1 block text-xs ${outsideBy > 0 ? "text-coral" : "text-teal"}`}>{fmtPct(allocationPct)}</span>
          </div>
        </div>
        <div className="px-3 pb-3">
          <div className="relative h-1.5 overflow-visible rounded-full bg-edge-2">
            <span
              className={`absolute inset-y-0 left-0 rounded-full ${outsideBy > 0 ? "bg-coral" : "bg-cyan"}`}
              style={{ width: `${Math.min(100, allocationPct * 100)}%` }}
            />
            <span
              className="absolute -top-1 h-3.5 w-px bg-ink"
              style={{ left: `${Math.min(100, deskSettings.maxPositionPct * 100)}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-ink-3">
            <span>$0</span>
            <span>{fmtPct(deskSettings.maxPositionPct, 0)} limit · {fmtMoney(positionLimit, 0)}</span>
            <span>{fmtMoney(cashRequired, 0)}</span>
          </div>
          <div className={`mt-2 flex items-center gap-2 rounded border px-2.5 py-2 text-[10px] ${outsideBy > 0 ? "border-coral/60 bg-coral/[0.06] text-coral" : "border-teal/50 bg-teal/[0.06] text-teal"}`}>
            {outsideBy > 0 ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span className="font-medium">
              {outsideBy > 0 ? `Outside your capital mandate by ${fmtMoney(outsideBy, 0)}` : `${fmtMoney(positionLimit - cashRequired, 0)} of position headroom remains`}
            </span>
          </div>
        </div>
      </InspectorSection>

      <InspectorSection
        number="3"
        title="Stress at expiry"
        action={
          <select
            value={stressMultiple}
            onChange={(event) => onStressMultiple(Number(event.target.value))}
            aria-label="Stress state"
            className="h-7 rounded border border-edge bg-panel-2 px-2 text-[10px] text-ink-2 outline-none focus:border-cyan/60"
          >
            <option value={0.5}>−0.5× expected move</option>
            <option value={1}>−1.0× expected move</option>
            <option value={1.5}>−1.5× expected move</option>
            <option value={2}>−2.0× expected move</option>
          </select>
        }
      >
        <div className="border-y border-edge bg-desk/50 px-2 pb-1 pt-2">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2 px-1 text-[9px] text-ink-3">
            <span>Scenario price <strong className="num ml-1 font-medium text-ink">{fmtMoney(scenarioPrice)}</strong></span>
            <span>Expiry P/L <strong className={`num ml-1 font-medium ${scenarioPnl < 0 ? "text-coral" : "text-teal"}`}>{fmtMoney(scenarioPnl, 0)}</strong></span>
          </div>
          <PayoffChart row={row} scenarioPrice={scenarioPrice} scenarioPnl={scenarioPnl} />
        </div>
        <p className="px-3 py-2 text-[9px] leading-relaxed text-ink-3">
          Expiry-only estimate · excludes early assignment, slippage, tax, dividends, and rolling. {row.strategy === "cc" ? "Covered-call share P/L uses current spot as the displayed basis." : "Cash-secured collateral is strike × 100."}
        </p>
      </InspectorSection>

      <EvidenceGrid evidence={evidence} />

      <footer className="sticky bottom-0 flex gap-2 border-t border-edge bg-panel/95 p-2.5 backdrop-blur">
        <Link
          href={`/ticker/${row.symbol}`}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded border border-edge-2 text-xs font-medium text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open workbench
        </Link>
        <button
          type="button"
          onClick={onSave}
          className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded border text-xs font-semibold transition-colors ${
            saved ? "border-teal/50 bg-teal/10 text-teal" : "border-cyan bg-cyan text-black hover:opacity-90"
          }`}
        >
          {saved ? <Check className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
          {saved ? "Saved to desk" : "Save to desk"}
        </button>
      </footer>

      <div className="flex flex-wrap justify-between gap-2 border-t border-edge px-3 py-2 text-[9px] text-ink-3">
        <span>Cboe delayed chain · {fmtDateTime(row.chainAsOf)}</span>
        <span>{row.fundamentals.source === "nasdaq" ? "Nasdaq reported fundamentals" : row.fundamentals.note ?? "Fundamentals unavailable"}{asOf ? ` · freeze ${fmtDateTime(asOf)}` : ""}</span>
      </div>
    </article>
  );
}

function InspectorSection({
  number,
  title,
  action,
  children,
}: {
  number: string;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-edge last:border-b-0">
      <header className="flex min-h-9 items-center gap-2 px-3 py-2">
        <span className="num inline-grid h-5 w-5 place-items-center rounded border border-edge-2 text-[10px] text-ink-2">{number}</span>
        <h3 className="text-xs font-semibold text-ink">{title}</h3>
        {action ? <div className="ml-auto">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0 border-r border-edge px-2.5 py-2 last:border-r-0">
      <span className="block truncate text-[8px] uppercase tracking-[0.07em] text-ink-3">{label}</span>
      <span className={`num mt-1 block truncate text-xs font-medium ${accent ? "text-cyan" : "text-ink"}`}>{value}</span>
    </div>
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
      <span className="mb-1 block text-[9px] text-ink-3">{label}</span>
      <span className="flex h-8 items-center rounded border border-edge bg-panel-2 px-2 focus-within:border-cyan/60">
        {prefix ? <span className="num text-[10px] text-ink-3">{prefix}</span> : null}
        <input
          type="number"
          value={value}
          step={step}
          onChange={(event) => {
            const next = Number(event.target.value);
            if (Number.isFinite(next)) onChange(next);
          }}
          className="num min-w-0 flex-1 bg-transparent px-1 text-xs text-ink outline-none"
        />
        {suffix ? <span className="num text-[10px] text-ink-3">{suffix}</span> : null}
      </span>
    </label>
  );
}

function EvidenceGrid({ evidence }: { evidence: ReturnType<typeof evidenceFor> }) {
  const groups = [
    { title: "Why it survives", items: evidence.survives, tone: "teal" as const, icon: CheckCircle2 },
    { title: "What breaks the thesis", items: evidence.breaks, tone: "coral" as const, icon: AlertTriangle },
    { title: "Evidence still missing", items: evidence.missing, tone: "muted" as const, icon: CircleHelp },
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
            <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 [&::-webkit-details-marker]:hidden">
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
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
        <Icon className={`h-3.5 w-3.5 ${toneClass}`} /> {title}
      </h3>
      <ul className="mt-2 space-y-1 text-[9px] leading-relaxed text-ink-2">
        {items.slice(0, 4).map((item) => (
          <li key={item} className="flex gap-1.5"><span className={toneClass}>•</span><span>{item}</span></li>
        ))}
      </ul>
    </section>
  );
}

function PayoffChart({
  row,
  scenarioPrice,
  scenarioPnl,
}: {
  row: ResearchRow;
  scenarioPrice: number;
  scenarioPnl: number;
}) {
  const chart = useMemo(() => {
    const move = Math.max(expectedMoveFor(row), 0.04);
    const low = Math.max(0.01, Math.min(row.breakeven, scenarioPrice, row.spot * (1 - move * 2.1)));
    const high = Math.max(row.strike, row.spot) * (1 + move * 1.2);
    const points = Array.from({ length: 49 }, (_, index) => {
      const price = low + (high - low) * (index / 48);
      return { price, pnl: expiryPnl(row, price) };
    });
    const minPnl = Math.min(0, scenarioPnl, ...points.map((point) => point.pnl));
    const maxPnl = Math.max(0, scenarioPnl, ...points.map((point) => point.pnl));
    return { low, high, points, minPnl, maxPnl };
  }, [row, scenarioPnl, scenarioPrice]);

  const width = 620;
  const height = 148;
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
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Expiry payoff chart. Scenario price ${fmtMoney(scenarioPrice)} produces ${fmtMoney(scenarioPnl, 0)} profit or loss.`} className="h-auto w-full overflow-visible">
      {yTicks.map((tick) => (
        <g key={tick}>
          <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="#23262e" strokeWidth="1" />
          <text x={left - 6} y={y(tick) + 3} textAnchor="end" fill="#767d8a" fontSize="9" fontFamily="var(--font-geist-mono)">{fmtMoney(tick, 0)}</text>
        </g>
      ))}
      {markers.map((marker) => (
        <g key={marker.label}>
          <line x1={x(marker.price)} x2={x(marker.price)} y1={top} y2={height - bottom} stroke={marker.color} strokeWidth="1" strokeDasharray={marker.dash} />
          <text x={x(marker.price) + 3} y={top + 8} fill={marker.color} fontSize="8">{marker.label}</text>
        </g>
      ))}
      <line x1={left} x2={width - right} y1={y(0)} y2={y(0)} stroke="#333843" strokeWidth="1" strokeDasharray="2 3" />
      <path d={path} fill="none" stroke="#00e5ff" strokeWidth="2.25" vectorEffect="non-scaling-stroke" />
      <line x1={x(scenarioPrice)} x2={x(scenarioPrice)} y1={top} y2={height - bottom} stroke="#ff3b4a" strokeWidth="1" strokeDasharray="4 3" />
      <circle cx={x(scenarioPrice)} cy={y(scenarioPnl)} r="4" fill="#07080a" stroke={scenarioPnl < 0 ? "#ff3b4a" : "#00d4aa"} strokeWidth="2" />
      {xTicks.map((tick) => (
        <text key={tick} x={x(tick)} y={height - 7} textAnchor="middle" fill="#767d8a" fontSize="9" fontFamily="var(--font-geist-mono)">{fmtMoney(tick, 0)}</text>
      ))}
    </svg>
  );
}

function DeskTray({
  strategy,
  rows,
  total,
  onSelect,
  onRemove,
  onClear,
}: {
  strategy: Strategy;
  rows: ResearchRow[];
  total: number;
  onSelect: (row: ResearchRow) => void;
  onRemove: (row: ResearchRow) => void;
  onClear: () => void;
}) {
  if (total === 0) return null;
  return (
    <div className="mt-3 hidden items-center gap-2 overflow-hidden rounded-lg border border-edge bg-panel px-3 py-2 lg:flex">
      <Bookmark className="h-4 w-4 text-cyan" />
      <div className="mr-1 shrink-0">
        <p className="text-xs font-semibold text-ink">Desk shortlist</p>
        <p className="num text-[9px] text-ink-3">{total} saved</p>
      </div>
      <div className="scroller flex min-w-0 flex-1 gap-2 overflow-x-auto">
        {rows.slice(0, 4).map((row) => (
          <div key={row.occSymbol} className="group flex min-w-40 shrink-0 items-center rounded border border-edge bg-desk transition-colors hover:border-edge-2">
            <button
              type="button"
              onClick={() => onSelect(row)}
              className="min-w-0 flex-1 px-2.5 py-1.5 text-left"
            >
              <span className="block text-xs font-medium text-ink">{row.symbol} <span className="num text-[10px] text-ink-2">· {fmtMoney(row.strike, 0)} {strategy === "csp" ? "put" : "call"}</span></span>
              <span className="num mt-0.5 block text-[9px] text-ink-3">{fmtDate(row.expiration)} · UW {row.research.underwriteScore ?? "gap"}</span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(row)}
              aria-label={`Remove ${row.symbol} from desk`}
              className="mr-1 rounded p-1 text-ink-3 transition-colors hover:text-ink"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {total > rows.length ? <span className="self-center text-[10px] text-ink-3">+{total - rows.length} saved in other scans</span> : null}
      </div>
      <button type="button" onClick={onClear} className="shrink-0 text-[10px] text-ink-3 hover:text-ink">Clear</button>
    </div>
  );
}
