"use client";

import { Fragment, useState, type RefObject } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Coins,
  Columns3,
  Copy,
  Search,
  Star,
  X,
} from "lucide-react";
import { ScoreBadge } from "@/components/score-badge";
import { fmtDate, fmtDateTime, fmtDelta, fmtMoney, fmtNum, fmtPct } from "@/lib/format";
import type { ScreenerRow } from "@/lib/types";

export type SortKey =
  | "score"
  | "annualized"
  | "roc"
  | "premium"
  | "dte"
  | "delta"
  | "buffer"
  | "oi"
  | "symbol";

export type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

export function ScanSummary({
  scanned,
  universeSize,
  contractCount,
  visibleCount,
  uniqueSymbols,
  medianAnnualized,
  medianBuffer,
  asOf,
  failed,
  error,
}: {
  scanned: number;
  universeSize: number | null;
  contractCount: number;
  visibleCount: number;
  uniqueSymbols: number;
  medianAnnualized: number | null;
  medianBuffer: number | null;
  asOf: string | null;
  failed: string[];
  error: string | null;
}) {
  const progress = universeSize && universeSize > 0 ? scanned / universeSize : 0;

  return (
    <section className="mt-3 overflow-hidden rounded-xl border border-edge bg-panel">
      <div className="grid grid-cols-2 lg:grid-cols-[minmax(23rem,1fr)_repeat(4,minmax(8rem,0.42fr))]">
        <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-edge px-4 py-3 lg:col-span-1 lg:border-b-0 lg:border-r">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-edge sm:w-32">
            <div
              className="h-full rounded-full bg-cyan transition-[width] duration-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <span className="num text-xs text-ink-2">
            {scanned}
            {universeSize ? `/${universeSize}` : ""} scanned
          </span>
          <span className="num text-xs text-ink-2">{contractCount} contracts</span>
          {asOf ? (
            <span className="text-[11px] text-ink-3">as of {fmtDateTime(asOf)}</span>
          ) : null}
          {failed.length > 0 ? (
            <span className="text-[11px] text-amber" title={failed.join(", ")}>
              {failed.length} unavailable
            </span>
          ) : null}
          {error ? <span className="text-[11px] text-coral">{error}</span> : null}
        </div>
        <SummaryMetric label="Visible matches" value={String(visibleCount)} />
        <SummaryMetric label="Unique symbols" value={String(uniqueSymbols)} />
        <SummaryMetric
          label="Median annualized"
          value={medianAnnualized === null ? "—" : fmtPct(medianAnnualized)}
          accent
        />
        <SummaryMetric
          label="Median buffer"
          value={medianBuffer === null ? "—" : fmtPct(medianBuffer)}
        />
      </div>
    </section>
  );
}

function SummaryMetric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="border-r border-edge px-4 py-3 last:border-r-0 max-lg:border-b max-lg:[&:nth-last-child(-n+2)]:border-b-0">
      <span className="block text-[9px] font-medium uppercase tracking-[0.16em] text-ink-3">
        {label}
      </span>
      <span className={`num mt-1 block text-base font-medium ${accent ? "text-teal" : "text-ink"}`}>
        {value}
      </span>
    </div>
  );
}

export function ResultsToolbar({
  query,
  searchRef,
  sector,
  sectors,
  shortlistOnly,
  shortlistCount,
  detailColumns,
  onQuery,
  onSector,
  onShortlistOnly,
  onDetailColumns,
}: {
  query: string;
  searchRef: RefObject<HTMLInputElement | null>;
  sector: string;
  sectors: string[];
  shortlistOnly: boolean;
  shortlistCount: number;
  detailColumns: boolean;
  onQuery: (query: string) => void;
  onSector: (sector: string) => void;
  onShortlistOnly: (value: boolean) => void;
  onDetailColumns: (value: boolean) => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-t-xl border border-edge bg-panel px-3 py-2.5">
      <label className="relative min-w-52 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
        <input
          ref={searchRef}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search ticker, company, or sector"
          aria-label="Search loaded scan results"
          className="h-8 w-full rounded-md border border-edge bg-panel-2 pl-8 pr-9 text-xs text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-cyan/60"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQuery("")}
            aria-label="Clear search"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-ink-3 hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-ink-3">
            /
          </kbd>
        )}
      </label>
      <select
        value={sector}
        onChange={(event) => onSector(event.target.value)}
        aria-label="Filter results by sector"
        className="h-8 min-w-40 rounded-md border border-edge bg-panel-2 px-2.5 text-xs text-ink-2 outline-none transition-colors focus:border-cyan/60"
      >
        <option value="all">All sectors</option>
        {sectors.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <button
        type="button"
        role="switch"
        aria-checked={shortlistOnly}
        onClick={() => onShortlistOnly(!shortlistOnly)}
        className={`inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-medium transition-colors ${
          shortlistOnly
            ? "border-cyan/50 bg-cyan/10 text-cyan"
            : "border-edge text-ink-2 hover:bg-panel-2 hover:text-ink"
        }`}
      >
        <Star className={`h-3.5 w-3.5 ${shortlistOnly ? "fill-current" : ""}`} />
        Shortlist{shortlistCount > 0 ? ` (${shortlistCount})` : ""}
      </button>
      <button
        type="button"
        aria-pressed={detailColumns}
        onClick={() => onDetailColumns(!detailColumns)}
        className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors ${
          detailColumns
            ? "border-cyan/50 bg-cyan/10 text-cyan"
            : "border-edge text-ink-2 hover:bg-panel-2 hover:text-ink"
        }`}
      >
        <Columns3 className="h-3.5 w-3.5" />
        Detail columns
      </button>
    </div>
  );
}

export function ScreenerResultsTable({
  rows,
  done,
  sort,
  detailColumns,
  expandedId,
  shortlist,
  onSort,
  onExpand,
  onToggleShortlist,
}: {
  rows: ScreenerRow[];
  done: boolean;
  sort: SortState;
  detailColumns: boolean;
  expandedId: string | null;
  shortlist: Set<string>;
  onSort: (key: SortKey) => void;
  onExpand: (id: string) => void;
  onToggleShortlist: (row: ScreenerRow) => void;
}) {
  const columnCount = detailColumns ? 18 : 14;

  return (
    <div className="scroller max-h-[68vh] overflow-auto rounded-b-xl border-x border-b border-edge">
      <table className="w-full min-w-[1120px] border-collapse text-sm">
        <thead>
          <tr className="text-left text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3">
            <Th
              sticky
              label="Ticker"
              sortKey="symbol"
              sort={sort}
              onSort={onSort}
              className="min-w-40"
            />
            <Th label="Score" sortKey="score" sort={sort} onSort={onSort} />
            <Th label="Strike" />
            <Th label="Annualized" sortKey="annualized" sort={sort} onSort={onSort} />
            <Th label="Buffer" sortKey="buffer" sort={sort} onSort={onSort} />
            <Th label="Spot" />
            <Th label="Exp / DTE" sortKey="dte" sort={sort} onSort={onSort} />
            <Th label="|Delta|" sortKey="delta" sort={sort} onSort={onSort} />
            <Th label="Premium" sortKey="premium" sort={sort} onSort={onSort} />
            <Th label="ROC" sortKey="roc" sort={sort} onSort={onSort} />
            <Th label="P(ITM)" />
            {detailColumns ? (
              <>
                <Th label="IV" />
                <Th label="IV/RV" />
                <Th label="Spread" />
                <Th label="Breakeven" />
              </>
            ) : null}
            <Th label="OI" sortKey="oi" sort={sort} onSort={onSort} />
            <Th label="Events" />
            <Th label="" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const expanded = expandedId === row.occSymbol;
            const shortlisted = shortlist.has(row.occSymbol);
            return (
              <Fragment key={row.occSymbol}>
                <tr
                  className={`border-b border-edge/70 transition-colors hover:bg-panel-2 ${
                    expanded ? "bg-panel-2" : "bg-desk"
                  }`}
                >
                  <td className="sticky left-0 z-10 bg-inherit px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => onToggleShortlist(row)}
                        aria-label={`${shortlisted ? "Remove" : "Add"} ${row.symbol} ${row.strike} from shortlist`}
                        aria-pressed={shortlisted}
                        className={`rounded p-0.5 transition-colors ${
                          shortlisted ? "text-cyan" : "text-ink-3 hover:text-ink"
                        }`}
                      >
                        <Star className={`h-3.5 w-3.5 ${shortlisted ? "fill-current" : ""}`} />
                      </button>
                      <Link href={`/ticker/${row.symbol}`} className="group min-w-0">
                        <span className="block font-semibold leading-none text-cyan group-hover:underline">
                          {row.symbol}
                        </span>
                        <span className="mt-1 block max-w-28 truncate text-[10px] leading-none text-ink-3">
                          {row.name}
                        </span>
                      </Link>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <ScoreBadge score={row.score} parts={row.scoreParts} />
                  </td>
                  <td className="num px-3 py-2 font-medium">{fmtMoney(row.strike)}</td>
                  <td className="num px-3 py-2 font-medium text-ink">
                    {fmtPct(row.rocAnnualized)}
                  </td>
                  <td className="num px-3 py-2">{fmtPct(row.otmPct)}</td>
                  <td className="num px-3 py-2">{fmtMoney(row.spot)}</td>
                  <td className="px-3 py-2">
                    <span className="num">{fmtDate(row.expiration)}</span>
                    <span className="num ml-1.5 text-[10px] text-ink-3">{row.dte}d</span>
                  </td>
                  <td className="num px-3 py-2">{fmtDelta(row.delta)}</td>
                  <td className="px-3 py-2">
                    <span className="num font-medium text-teal">{fmtMoney(row.premium, 0)}</span>
                    <span className="num ml-1.5 text-[10px] text-ink-3">{fmtMoney(row.mid)}</span>
                  </td>
                  <td className="num px-3 py-2">{fmtPct(row.roc)}</td>
                  <td className="num px-3 py-2">{fmtPct(row.pItm, 0)}</td>
                  {detailColumns ? (
                    <>
                      <td className="num px-3 py-2">{fmtPct(row.iv, 0)}</td>
                      <td className="num px-3 py-2">{row.ivRv?.toFixed(2) ?? "—"}</td>
                      <td className="num px-3 py-2">{fmtPct(row.spreadPct, 0)}</td>
                      <td className="num px-3 py-2">{fmtMoney(row.breakeven)}</td>
                    </>
                  ) : null}
                  <td className="num px-3 py-2">{fmtNum(row.openInterest)}</td>
                  <td className="px-3 py-2">
                    <EventIcons row={row} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onExpand(row.occSymbol)}
                      aria-expanded={expanded}
                      aria-label={`${expanded ? "Collapse" : "Expand"} ${row.symbol} contract details`}
                      className={`rounded-md border p-1.5 transition-colors ${
                        expanded
                          ? "border-cyan/50 bg-cyan/10 text-cyan"
                          : "border-edge text-ink-3 hover:bg-panel hover:text-ink"
                      }`}
                    >
                      {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </td>
                </tr>
                {expanded ? (
                  <tr className="border-b border-cyan/50 bg-panel">
                    <td colSpan={columnCount} className="p-2">
                      <ContractDetail row={row} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="px-4 py-16 text-center text-sm text-ink-3">
                {done
                  ? "No contracts match this view. Clear the result search or widen the scan filters."
                  : "Scanning the universe… matching contracts will stream in here."}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  label,
  sortKey,
  sort,
  onSort,
  sticky = false,
  className = "",
}: {
  label: string;
  sortKey?: SortKey;
  sort?: SortState;
  onSort?: (key: SortKey) => void;
  sticky?: boolean;
  className?: string;
}) {
  const active = sortKey !== undefined && sort?.key === sortKey;
  return (
    <th
      aria-sort={
        active ? (sort?.direction === "asc" ? "ascending" : "descending") : undefined
      }
      className={`sticky top-0 z-20 border-b border-edge bg-panel px-3 py-2.5 ${
        sticky ? "left-0 z-30" : ""
      } ${className}`}
    >
      {sortKey && sort && onSort ? (
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className={`inline-flex items-center gap-1 uppercase tracking-[0.14em] transition-colors ${
            active ? "text-cyan" : "hover:text-ink"
          }`}
        >
          {label}
          {active ? (
            sort.direction === "desc" ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUp className="h-3 w-3" />
            )
          ) : null}
        </button>
      ) : (
        label
      )}
    </th>
  );
}

function ContractDetail({ row }: { row: ScreenerRow }) {
  const capital = row.strategy === "csp" ? row.strike * 100 : row.spot * 100;
  const rv = row.iv !== null && row.ivRv ? row.iv / row.ivRv : null;
  const eventRisk = row.earningsDate || row.exDivDate;

  return (
    <div className="sticky left-0 w-[calc(100vw-3rem)] rounded-lg border border-edge-2 bg-desk px-4 py-4 shadow-[inset_3px_0_0_rgba(0,229,255,0.75)] sm:static sm:w-auto">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-edge pb-3">
        <div>
          <p className="font-medium text-ink">
            {row.symbol} {fmtMoney(row.strike)} {row.strategy === "csp" ? "put" : "call"}
            <span className="font-normal text-ink-3"> · {fmtDate(row.expiration)} ({row.dte}d)</span>
          </p>
          <p className="num mt-1 text-[11px] text-ink-3">{row.occSymbol}</p>
        </div>
        <span className={`text-xs ${eventRisk ? "text-amber" : "text-teal"}`}>
          {eventRisk ? "Event risk in trade window" : "No known event in trade window"}
        </span>
      </div>
      <dl className="grid grid-cols-2 divide-x divide-y divide-edge/80 sm:grid-cols-3 lg:grid-cols-6">
        <DetailMetric
          label={row.strategy === "csp" ? "Cash required" : "Share value"}
          value={fmtMoney(capital, 0)}
        />
        <DetailMetric label="Breakeven" value={fmtMoney(row.breakeven)} />
        <DetailMetric label="Bid / ask" value={`${fmtMoney(row.bid)} / ${fmtMoney(row.ask)}`} />
        <DetailMetric
          label="IV / RV (30d)"
          value={`${fmtPct(row.iv, 0)} / ${fmtPct(rv, 0)}`}
        />
        <DetailMetric label="Spread" value={fmtPct(row.spreadPct)} />
        <DetailMetric label="Volume / OI" value={`${fmtNum(row.volume)} / ${fmtNum(row.openInterest)}`} />
        <DetailMetric label="Premium" value={`${fmtMoney(row.premium, 0)} (${fmtMoney(row.mid)}/sh)`} />
        <DetailMetric label="Period / annualized" value={`${fmtPct(row.roc)} / ${fmtPct(row.rocAnnualized)}`} />
        <DetailMetric label="Buffer / P(ITM)" value={`${fmtPct(row.otmPct)} / ${fmtPct(row.pItm, 0)}`} />
        <DetailMetric label="Sector" value={row.sector} />
        <DetailMetric label="Earnings" value={fmtDate(row.earningsDate)} warning={row.earningsDate !== null} />
        <DetailMetric label="Ex-dividend" value={fmtDate(row.exDivDate)} warning={row.exDivDate !== null} />
      </dl>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Link
          href={`/ticker/${row.symbol}`}
          className="inline-flex h-8 items-center justify-center rounded-md bg-cyan px-3 text-xs font-semibold text-black transition-opacity hover:opacity-90"
        >
          Open {row.symbol} workbench
        </Link>
        <CopyTradeButton row={row} label />
      </div>
    </div>
  );
}

function DetailMetric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="min-w-0 px-3 py-3 first:pl-0">
      <dt className="text-[10px] uppercase tracking-[0.12em] text-ink-3">{label}</dt>
      <dd className={`num mt-1 truncate text-xs ${warning ? "text-amber" : "text-ink"}`} title={value}>
        {value}
      </dd>
    </div>
  );
}

function EventIcons({ row }: { row: ScreenerRow }) {
  return (
    <span className="flex items-center gap-1.5">
      {row.earningsDate ? (
        <span title={`Earnings ${row.earningsDate} — inside this trade's window`}>
          <CalendarClock className="h-4 w-4 text-amber" />
        </span>
      ) : null}
      {row.exDivDate ? (
        <span title={`Ex-dividend ${row.exDivDate} — inside this trade's window`}>
          <Coins className="h-4 w-4 text-teal" />
        </span>
      ) : null}
      {!row.earningsDate && !row.exDivDate ? <span className="text-ink-3">—</span> : null}
    </span>
  );
}

function CopyTradeButton({ row, label = false }: { row: ScreenerRow; label?: boolean }) {
  const [copied, setCopied] = useState(false);
  const order = `SELL -1 ${row.symbol} ${row.expiration} ${row.strike} ${
    row.strategy === "csp" ? "PUT" : "CALL"
  } @ ~${row.mid.toFixed(2)} mid (${row.occSymbol})`;

  return (
    <button
      type="button"
      title={`Copy order line:\n${order}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(order);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard permissions can be disabled without affecting the scanner.
        }
      }}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md border border-edge text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink ${
        label ? "h-8 px-3 text-xs" : "p-1.5"
      }`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-teal" /> : <Copy className="h-3.5 w-3.5" />}
      {label ? (copied ? "Copied" : "Copy order") : null}
    </button>
  );
}

export function ShortlistTray({
  rows,
  total,
  onRemove,
  onClear,
}: {
  rows: ScreenerRow[];
  total: number;
  onRemove: (row: ScreenerRow) => void;
  onClear: () => void;
}) {
  if (total === 0) return null;

  return (
    <div className="sticky bottom-3 z-30 mt-3 hidden items-center gap-2 rounded-xl border border-edge-2 bg-panel/95 px-3 py-2 shadow-2xl backdrop-blur sm:flex">
      <Star className="h-4 w-4 fill-current text-cyan" />
      <span className="mr-1 text-xs font-semibold">Shortlist ({total})</span>
      <div className="scroller flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        {rows.slice(0, 5).map((row) => (
          <span
            key={row.occSymbol}
            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-edge bg-desk px-2.5 py-1.5"
          >
            <Link href={`/ticker/${row.symbol}`} className="text-xs font-medium text-cyan hover:underline">
              {row.symbol}
            </Link>
            <span className="num text-[10px] text-ink-3">
              {fmtMoney(row.strike, 0)} · {fmtDate(row.expiration)}
            </span>
            <button
              type="button"
              onClick={() => onRemove(row)}
              aria-label={`Remove ${row.symbol} from shortlist`}
              className="text-ink-3 hover:text-ink"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {total > rows.slice(0, 5).length ? (
          <span className="shrink-0 text-[11px] text-ink-3">
            +{total - rows.slice(0, 5).length} saved from other scans
          </span>
        ) : null}
      </div>
      <button type="button" onClick={onClear} className="text-[11px] text-ink-3 hover:text-ink">
        Clear all
      </button>
    </div>
  );
}
