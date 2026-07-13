"use client";

import { Fragment, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Coins,
  Columns3,
  Copy,
  Database,
  Search,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";
import { fmtDate, fmtDateTime, fmtDelta, fmtMoney, fmtNum, fmtPct } from "@/lib/format";
import type { FactorMetric, ResearchRow } from "@/lib/research";

export type SortKey =
  | "underwrite"
  | "valuation"
  | "quality"
  | "volEdge"
  | "execution"
  | "annualized"
  | "buffer"
  | "spread"
  | "oi"
  | "symbol";

export type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};

export function ResearchPipeline({
  scanned,
  universeSize,
  done,
}: {
  scanned: number;
  universeSize: number | null;
  done: boolean;
}) {
  const progress = universeSize && universeSize > 0 ? scanned / universeSize : 0;
  const stages = [
    ["Universe", universeSize ? `${scanned} / ${universeSize} securities` : "Loading universe"],
    ["Fundamental normalization", "Deriving TTM factors"],
    ["Volatility edge", "Comparing IV, RV and skew"],
    ["Execution gate", done ? "Liquidity and events checked" : "Streaming contracts"],
  ];

  return (
    <section className="relative mt-3 overflow-hidden rounded-lg border border-edge bg-panel">
      <div className="absolute inset-x-0 top-0 h-px bg-edge">
        <div
          className={`h-full bg-cyan shadow-[0_0_10px_rgba(0,229,255,0.75)] ${
            done ? "" : "pipeline-scan"
          }`}
          style={{ width: `${Math.max(2, Math.round(progress * 100))}%` }}
        />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4">
        {stages.map(([label, detail], index) => (
          <div
            key={label}
            className="flex min-w-0 items-center gap-3 border-b border-edge px-4 py-3 last:border-b-0 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:border-r lg:last:border-r-0"
          >
            <span className="num text-xs text-cyan">{index + 1}</span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-ink">{label}</p>
              <p className="num mt-0.5 truncate text-[10px] text-ink-3">{detail}</p>
            </div>
            {index < stages.length - 1 ? (
              <ArrowRight className="ml-auto hidden h-3.5 w-3.5 text-edge-2 lg:block" />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function ScanSummary({
  qualified,
  scanned,
  universeSize,
  fundamentalCoverage,
  medianIvRv,
  dataGaps,
  asOf,
  failed,
  error,
}: {
  qualified: number;
  scanned: number;
  universeSize: number | null;
  fundamentalCoverage: number;
  medianIvRv: number | null;
  dataGaps: number;
  asOf: string | null;
  failed: string[];
  error: string | null;
}) {
  return (
    <section className="mt-3 overflow-hidden rounded-lg border border-edge bg-panel">
      <div className="grid grid-cols-2 lg:grid-cols-[1.25fr_repeat(4,1fr)]">
        <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-edge px-4 py-3 lg:col-span-1 lg:border-b-0 lg:border-r">
          <Database className="h-4 w-4 text-cyan" aria-hidden />
          <span className="num text-xs text-ink-2">
            {scanned}
            {universeSize ? ` / ${universeSize}` : ""} coverage
          </span>
          {asOf ? <span className="text-[10px] text-ink-3">freeze {fmtDateTime(asOf)}</span> : null}
          {failed.length > 0 ? (
            <span className="text-[10px] text-amber" title={failed.join(", ")}>
              {failed.length} chains unavailable
            </span>
          ) : null}
          {error ? <span className="text-[10px] text-coral">{error}</span> : null}
        </div>
        <SummaryMetric label="Qualified" value={String(qualified)} accent="teal" />
        <SummaryMetric label="Fundamental coverage" value={fmtPct(fundamentalCoverage, 0)} />
        <SummaryMetric
          label="Median IV / RV30"
          value={medianIvRv === null ? "—" : `${medianIvRv.toFixed(2)}×`}
          accent="cyan"
        />
        <SummaryMetric
          label="Data gaps"
          value={String(dataGaps)}
          accent={dataGaps > 0 ? "amber" : undefined}
        />
      </div>
    </section>
  );
}

function SummaryMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "cyan" | "teal" | "amber";
}) {
  const color = accent === "teal" ? "text-teal" : accent === "amber" ? "text-amber" : accent === "cyan" ? "text-cyan" : "text-ink";
  return (
    <div className="border-r border-edge px-4 py-3 last:border-r-0 max-lg:border-b max-lg:[&:nth-last-child(-n+2)]:border-b-0">
      <span className="block text-[9px] font-medium uppercase tracking-[0.16em] text-ink-3">
        {label}
      </span>
      <span className={`num mt-1 block text-base font-medium ${color}`}>{value}</span>
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
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-t-lg border border-edge bg-panel px-3 py-2.5">
      <label className="relative min-w-52 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
        <input
          ref={searchRef}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search ticker, company, or sector"
          aria-label="Search loaded scan results"
          className="h-8 w-full rounded border border-edge bg-panel-2 pl-8 pr-9 text-xs text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-cyan/60"
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
        className="h-8 min-w-40 rounded border border-edge bg-panel-2 px-2.5 text-xs text-ink-2 outline-none transition-colors focus:border-cyan/60"
      >
        <option value="all">All sectors</option>
        {sectors.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
      <button
        type="button"
        role="switch"
        aria-checked={shortlistOnly}
        onClick={() => onShortlistOnly(!shortlistOnly)}
        className={`inline-flex h-8 items-center gap-2 rounded border px-2.5 text-xs font-medium transition-colors ${
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
        className={`inline-flex h-8 items-center gap-1.5 rounded border px-2.5 text-xs transition-colors ${
          detailColumns
            ? "border-cyan/50 bg-cyan/10 text-cyan"
            : "border-edge text-ink-2 hover:bg-panel-2 hover:text-ink"
        }`}
      >
        <Columns3 className="h-3.5 w-3.5" />
        {detailColumns ? "Underwrite columns" : "Contract columns"}
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
  rows: ResearchRow[];
  done: boolean;
  sort: SortState;
  detailColumns: boolean;
  expandedId: string | null;
  shortlist: Set<string>;
  onSort: (key: SortKey) => void;
  onExpand: (id: string) => void;
  onToggleShortlist: (row: ResearchRow) => void;
}) {
  const columnCount = detailColumns ? 20 : 16;

  return (
    <div className="scroller max-h-[68vh] overflow-auto rounded-b-lg border-x border-b border-edge">
      <table className="w-full min-w-[1320px] border-collapse text-xs">
        <thead>
          <tr className="text-left text-[9px] font-medium uppercase tracking-[0.13em] text-ink-3">
            <Th label="Rank" />
            <Th sticky label="Ticker" sortKey="symbol" sort={sort} onSort={onSort} className="min-w-36" />
            <Th label="Underwrite" sortKey="underwrite" sort={sort} onSort={onSort} />
            <Th label="Valuation" sortKey="valuation" sort={sort} onSort={onSort} className="min-w-36" />
            <Th label="Quality" sortKey="quality" sort={sort} onSort={onSort} />
            <Th label="Vol edge" sortKey="volEdge" sort={sort} onSort={onSort} />
            <Th label="Execution" sortKey="execution" sort={sort} onSort={onSort} />
            <Th label="Strike" />
            <Th label="Exp / DTE" />
            <Th label="|Delta|" />
            <Th label="Annualized" sortKey="annualized" sort={sort} onSort={onSort} />
            <Th label="Buffer" sortKey="buffer" sort={sort} onSort={onSort} />
            {detailColumns ? (
              <>
                <Th label="Premium" />
                <Th label="ROC" />
                <Th label="IV" />
                <Th label="IV / RV" />
              </>
            ) : null}
            <Th label="Spread" sortKey="spread" sort={sort} onSort={onSort} />
            <Th label="OI" sortKey="oi" sort={sort} onSort={onSort} />
            <Th label="Events" />
            <Th label="" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const expanded = expandedId === row.occSymbol;
            const shortlisted = shortlist.has(row.occSymbol);
            return (
              <Fragment key={row.occSymbol}>
                <tr className={`border-b border-edge/80 transition-colors hover:bg-panel-2 ${expanded ? "bg-panel-2" : "bg-desk"}`}>
                  <td className="num px-3 py-2 text-ink-3">{index + 1}</td>
                  <td className="sticky left-0 z-10 bg-inherit px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => onToggleShortlist(row)}
                        aria-label={`${shortlisted ? "Remove" : "Add"} ${row.symbol} ${row.strike} from shortlist`}
                        aria-pressed={shortlisted}
                        className={`rounded p-0.5 transition-colors ${shortlisted ? "text-cyan" : "text-ink-3 hover:text-ink"}`}
                      >
                        <Star className={`h-3.5 w-3.5 ${shortlisted ? "fill-current" : ""}`} />
                      </button>
                      <Link href={`/ticker/${row.symbol}`} className="group min-w-0">
                        <span className="block font-semibold leading-none text-cyan group-hover:underline">{row.symbol}</span>
                        <span className="mt-1 block max-w-24 truncate text-[9px] leading-none text-ink-3">{row.name}</span>
                      </Link>
                    </div>
                  </td>
                  <td className="px-3 py-2"><UnderwriteBadge row={row} /></td>
                  <td className="px-3 py-2"><ValuationCell row={row} /></td>
                  <td className="num px-3 py-2"><FactorScore value={row.research.qualityScore} /></td>
                  <td className="num px-3 py-2"><FactorScore value={row.research.volEdgeScore} /></td>
                  <td className="num px-3 py-2"><FactorScore value={row.research.executionScore} /></td>
                  <td className="num px-3 py-2 font-medium">{fmtMoney(row.strike)}</td>
                  <td className="px-3 py-2">
                    <span className="num">{fmtDate(row.expiration)}</span>
                    <span className="num ml-1 text-[9px] text-ink-3">{row.dte}d</span>
                  </td>
                  <td className="num px-3 py-2">{fmtDelta(row.delta)}</td>
                  <td className="num px-3 py-2 font-medium text-teal">{fmtPct(row.rocAnnualized)}</td>
                  <td className="num px-3 py-2">{fmtPct(row.otmPct)}</td>
                  {detailColumns ? (
                    <>
                      <td className="num px-3 py-2">{fmtMoney(row.premium, 0)}</td>
                      <td className="num px-3 py-2">{fmtPct(row.roc)}</td>
                      <td className="num px-3 py-2">{fmtPct(row.iv, 0)}</td>
                      <td className="num px-3 py-2">{row.ivRv?.toFixed(2) ?? "—"}</td>
                    </>
                  ) : null}
                  <td className={`num px-3 py-2 ${row.spreadPct !== null && row.spreadPct > 0.12 ? "text-amber" : ""}`}>{fmtPct(row.spreadPct, 0)}</td>
                  <td className="num px-3 py-2">{fmtNum(row.openInterest)}</td>
                  <td className="px-3 py-2"><EventIcons row={row} /></td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => onExpand(row.occSymbol)}
                      aria-expanded={expanded}
                      aria-label={`${expanded ? "Collapse" : "Expand"} ${row.symbol} assignment underwrite`}
                      className={`rounded border p-1.5 transition-colors ${expanded ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-edge text-ink-3 hover:bg-panel hover:text-ink"}`}
                    >
                      {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                    </button>
                  </td>
                </tr>
                {expanded ? (
                  <tr className="border-b border-cyan/40 bg-panel">
                    <td colSpan={columnCount} className="p-2"><AssignmentUnderwrite row={row} /></td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columnCount} className="px-4 py-16 text-center text-sm text-ink-3">
                {done
                  ? "No contracts pass the full mandate. Widen a gate or inspect data gaps."
                  : "Scanning, normalizing fundamentals, and ranking sector peers…"}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function UnderwriteBadge({ row }: { row: ResearchRow }) {
  const value = row.research.underwriteScore;
  if (value === null) {
    return <span className="num text-[10px] text-amber" title={row.research.missingEvidence.join(" · ")}>DATA GAP</span>;
  }
  const color = value >= 75 ? "border-teal/40 bg-teal/10 text-teal" : value >= 60 ? "border-cyan/40 bg-cyan/10 text-cyan" : value >= 45 ? "border-amber/40 bg-amber/10 text-amber" : "border-coral/40 bg-coral/10 text-coral";
  return (
    <span title={`Composite confidence ${row.research.confidence}%`} className={`num inline-flex min-w-9 justify-center rounded border px-2 py-0.5 text-xs font-semibold ${color}`}>
      {value}
    </span>
  );
}

function FactorScore({ value }: { value: number | null }) {
  if (value === null) return <span className="text-ink-3">—</span>;
  const color = value >= 70 ? "text-teal" : value >= 50 ? "text-ink" : value >= 35 ? "text-amber" : "text-coral";
  return <span className={color}>{value}</span>;
}

function ValuationCell({ row }: { row: ResearchRow }) {
  const percentile = row.research.valuationPercentile;
  const color = percentile === null ? "text-ink-3" : percentile <= 40 ? "text-teal" : percentile <= 60 ? "text-ink" : percentile <= 80 ? "text-amber" : "text-coral";
  return (
    <span className={color}>
      <span className="block text-[11px] font-medium">{row.research.valuationLabel}</span>
      <span className="num mt-0.5 block text-[9px] opacity-75">{percentile === null ? row.fundamentals.note ?? "Unavailable" : `${percentile}th price pct · ${row.research.peerCount} peers`}</span>
    </span>
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
      aria-sort={active ? (sort?.direction === "asc" ? "ascending" : "descending") : undefined}
      className={`sticky top-0 z-20 border-b border-edge bg-panel px-3 py-2.5 ${sticky ? "left-0 z-30" : ""} ${className}`}
    >
      {sortKey && sort && onSort ? (
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className={`inline-flex items-center gap-1 uppercase tracking-[0.13em] transition-colors ${active ? "text-cyan" : "hover:text-ink"}`}
        >
          {label}
          {active ? sort.direction === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" /> : null}
        </button>
      ) : label}
    </th>
  );
}

function AssignmentUnderwrite({ row }: { row: ResearchRow }) {
  const fundamentalSource =
    row.fundamentals.source === "nasdaq"
      ? "Nasdaq reported financials"
      : row.fundamentals.source === "not-applicable"
        ? "ETF · company factors N/A"
        : "Fundamentals unavailable";

  return (
    <div className="sticky left-0 w-[calc(100vw-3rem)] border border-edge-2 bg-desk shadow-[inset_3px_0_0_rgba(0,229,255,0.75)] sm:static sm:w-auto">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-edge px-4 py-3">
        <div>
          <p className="font-medium text-ink">
            Assignment underwrite · <span className="text-cyan">{row.symbol}</span>
            <span className="font-normal text-ink-3"> · {fmtMoney(row.strike)} {row.strategy === "csp" ? "put" : "call"} · {fmtDate(row.expiration)}</span>
          </p>
          <p className="num mt-1 text-[10px] text-ink-3">{row.occSymbol}</p>
        </div>
        <div className="text-right text-[10px] text-ink-3">
          <p>{fundamentalSource} · period {fmtDate(row.fundamentals.asOf)}</p>
          <p>Cboe delayed chain · {fmtDateTime(row.chainAsOf)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.15fr_1.05fr_0.9fr_0.9fr_1.15fr]">
        <FactorPanel title="Valuation vs peers" score={row.research.valuationScore}>
          <MetricTable metrics={row.research.valuationMetrics} />
          <p className="mt-3 text-[9px] leading-relaxed text-ink-3">
            {row.research.peerLabel} · current market cap / latest four reported quarters. Lower price percentile is cheaper.
          </p>
        </FactorPanel>
        <FactorPanel title="Quality" score={row.research.qualityScore}>
          <MetricTable metrics={row.research.qualityMetrics} />
          <p className="mt-3 text-[9px] leading-relaxed text-ink-3">
            Profitability, cash conversion, and leverage are ranked separately from valuation.
          </p>
        </FactorPanel>
        <FactorPanel title="Option edge" score={row.research.volEdgeScore}>
          <DetailRow label="Contract IV" value={fmtPct(row.iv, 0)} />
          <DetailRow label="Underlying IV30" value={fmtPct(row.iv30, 0)} />
          <DetailRow label="RV30" value={row.ivRv && row.iv ? fmtPct(row.iv / row.ivRv, 0) : "—"} />
          <DetailRow label="IV / RV30" value={row.ivRv ? `${row.ivRv.toFixed(2)}×` : "—"} />
          <DetailRow label="Contract IV / IV30" value={row.ivToIv30 ? `${row.ivToIv30.toFixed(2)}×` : "—"} />
          <p className="mt-3 text-[9px] text-ink-3">Basis: {row.research.volEdgeBasis}</p>
        </FactorPanel>
        <FactorPanel title="Execution" score={row.research.executionScore}>
          <DetailRow label="Bid / ask" value={`${fmtMoney(row.bid)} / ${fmtMoney(row.ask)}`} />
          <DetailRow label="Mid" value={fmtMoney(row.mid)} />
          <DetailRow label="Spread" value={fmtPct(row.spreadPct)} warning={(row.spreadPct ?? 0) > 0.12} />
          <DetailRow label="Volume / OI" value={`${fmtNum(row.volume)} / ${fmtNum(row.openInterest)}`} />
          <DetailRow label="Cash required" value={fmtMoney(row.strike * 100, 0)} />
        </FactorPanel>
        <FactorPanel title="Missing evidence" score={row.research.confidence} scoreLabel="confidence">
          {row.research.missingEvidence.length > 0 ? (
            <ul className="space-y-2 text-[10px] text-amber">
              {row.research.missingEvidence.map((item) => (
                <li key={item} className="flex gap-2"><span>—</span><span>{item}</span></li>
              ))}
            </ul>
          ) : (
            <p className="text-[10px] text-teal">No material data gaps in this screen.</p>
          )}
          <div className="mt-3 border-t border-dashed border-edge pt-3">
            <DetailRow label="Earnings" value={row.eventDataAvailable ? fmtDate(row.earningsDate) : "Calendar unavailable"} warning={!row.eventDataAvailable || row.earningsDate !== null} />
            <DetailRow label="Ex-dividend" value={row.eventDataAvailable ? fmtDate(row.exDivDate) : "Calendar unavailable"} warning={!row.eventDataAvailable} />
          </div>
        </FactorPanel>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge px-4 py-3">
        <p className="max-w-3xl text-[10px] leading-relaxed text-ink-3">
          Composite: 45% assignment quality, 25% volatility edge, 20% execution, 10% carry. Missing fundamentals never receive a neutral score.
        </p>
        <div className="flex gap-2">
          <Link href={`/ticker/${row.symbol}`} className="inline-flex h-8 items-center justify-center rounded bg-cyan px-3 text-xs font-semibold text-black transition-opacity hover:opacity-90">
            Open {row.symbol} workbench
          </Link>
          <CopyTradeButton row={row} label />
        </div>
      </div>
    </div>
  );
}

function FactorPanel({
  title,
  score,
  scoreLabel = "score",
  children,
}: {
  title: string;
  score: number | null;
  scoreLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 border-b border-edge p-4 lg:border-b-0 lg:border-r lg:last:border-r-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold text-cyan">{title}</h3>
        <span className="num text-[9px] text-ink-3">{score === null ? "—" : `${score} ${scoreLabel}`}</span>
      </div>
      {children}
    </section>
  );
}

function MetricTable({ metrics }: { metrics: FactorMetric[] }) {
  return (
    <dl>
      {metrics.map((metric) => (
        <DetailRow
          key={metric.key}
          label={metric.label}
          value={
            metric.value === null
              ? "—"
              : `${metric.format === "percent" ? fmtPct(metric.value) : `${metric.value.toFixed(1)}×`}${metric.percentile === null ? "" : ` · P${Math.round(metric.percentile)}`}`
          }
        />
      ))}
    </dl>
  );
}

function DetailRow({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-edge/70 py-1.5 last:border-b-0">
      <dt className="truncate text-[9px] text-ink-3">{label}</dt>
      <dd className={`num shrink-0 text-[10px] ${warning ? "text-amber" : "text-ink"}`}>{value}</dd>
    </div>
  );
}

function EventIcons({ row }: { row: ResearchRow }) {
  if (!row.eventDataAvailable) {
    return <span title="Forward event calendar unavailable" className="text-[9px] text-amber">GAP</span>;
  }
  return (
    <span className="flex items-center gap-1.5">
      {row.earningsDate ? <span title={`Earnings ${row.earningsDate} — inside this trade window`}><CalendarClock className="h-3.5 w-3.5 text-amber" /></span> : null}
      {row.exDivDate ? <span title={`Ex-dividend ${row.exDivDate} — inside this trade window`}><Coins className="h-3.5 w-3.5 text-teal" /></span> : null}
      {!row.earningsDate && !row.exDivDate ? <ShieldCheck className="h-3.5 w-3.5 text-teal" aria-label="No known event in window" /> : null}
    </span>
  );
}

function CopyTradeButton({ row, label = false }: { row: ResearchRow; label?: boolean }) {
  const [copied, setCopied] = useState(false);
  const order = `SELL -1 ${row.symbol} ${row.expiration} ${row.strike} ${row.strategy === "csp" ? "PUT" : "CALL"} @ ~${row.mid.toFixed(2)} mid (${row.occSymbol})`;
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
          // Clipboard permissions can be disabled without affecting research.
        }
      }}
      className={`inline-flex items-center justify-center gap-1.5 rounded border border-edge text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink ${label ? "h-8 px-3 text-xs" : "p-1.5"}`}
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
  rows: ResearchRow[];
  total: number;
  onRemove: (row: ResearchRow) => void;
  onClear: () => void;
}) {
  if (total === 0) return null;
  return (
    <div className="sticky bottom-3 z-30 mt-3 hidden items-center gap-2 rounded-lg border border-edge-2 bg-panel/95 px-3 py-2 shadow-2xl backdrop-blur sm:flex">
      <Star className="h-4 w-4 fill-current text-cyan" />
      <span className="mr-1 text-xs font-semibold">Shortlist ({total})</span>
      <div className="scroller flex min-w-0 flex-1 items-center gap-2 overflow-x-auto">
        {rows.slice(0, 5).map((row) => (
          <span key={row.occSymbol} className="inline-flex shrink-0 items-center gap-2 rounded border border-edge bg-desk px-2.5 py-1.5">
            <Link href={`/ticker/${row.symbol}`} className="text-xs font-medium text-cyan hover:underline">{row.symbol}</Link>
            <span className="num text-[10px] text-ink-3">{fmtMoney(row.strike, 0)} · {fmtDate(row.expiration)} · UW {row.research.underwriteScore ?? "gap"}</span>
            <button type="button" onClick={() => onRemove(row)} aria-label={`Remove ${row.symbol} from shortlist`} className="text-ink-3 hover:text-ink"><X className="h-3 w-3" /></button>
          </span>
        ))}
        {total > rows.slice(0, 5).length ? <span className="shrink-0 text-[11px] text-ink-3">+{total - rows.slice(0, 5).length} saved from other scans</span> : null}
      </div>
      <button type="button" onClick={onClear} className="text-[11px] text-ink-3 hover:text-ink">Clear all</button>
    </div>
  );
}
