import type { ResearchRow } from "@/lib/research";

const COLUMNS: Array<[string, (row: ResearchRow) => string | number]> = [
  ["symbol", (r) => r.symbol],
  ["strategy", (r) => (r.strategy === "csp" ? "cash-secured put" : "covered call")],
  ["occ_symbol", (r) => r.occSymbol],
  ["spot", (r) => r.spot],
  ["strike", (r) => r.strike],
  ["expiration", (r) => r.expiration],
  ["dte", (r) => r.dte],
  ["bid", (r) => r.bid ?? ""],
  ["ask", (r) => r.ask ?? ""],
  ["mid", (r) => r.mid],
  ["premium_per_contract", (r) => r.premium],
  ["delta", (r) => r.delta ?? ""],
  ["iv", (r) => r.iv ?? ""],
  ["iv_rv", (r) => r.ivRv ?? ""],
  ["rv_30", (r) => r.rv30 ?? ""],
  ["rv_30_source", (r) => r.rv30Source ?? ""],
  ["iv_30", (r) => r.iv30 ?? ""],
  ["contract_iv_to_iv30", (r) => r.ivToIv30 ?? ""],
  ["spread_pct", (r) => r.spreadPct ?? ""],
  ["roc", (r) => r.roc],
  ["roc_annualized", (r) => r.rocAnnualized],
  ["prob_itm", (r) => r.pItm ?? ""],
  ["breakeven", (r) => r.breakeven],
  ["otm_pct", (r) => r.otmPct],
  ["risk_buffer_pct", (r) => r.research.riskBufferPct],
  ["expected_move_pct", (r) => r.research.expectedMovePct ?? ""],
  ["buffer_to_expected_move", (r) => r.research.expectedMoveCoverage ?? ""],
  ["open_interest", (r) => r.openInterest ?? ""],
  ["earnings_in_window", (r) => r.earningsDate ?? ""],
  ["ex_div_in_window", (r) => r.exDivDate ?? ""],
  ["underwrite_score", (r) => r.research.underwriteScore ?? ""],
  ["underwrite_status", (r) => r.research.status],
  ["binding_risk", (r) => r.research.bindingRisk],
  ["assignment_score", (r) => r.research.assignmentScore ?? ""],
  ["valuation_price_percentile", (r) => r.research.valuationPercentile ?? ""],
  ["valuation_label", (r) => r.research.valuationLabel],
  ["quality_score", (r) => r.research.qualityScore ?? ""],
  ["vol_edge_score", (r) => r.research.volEdgeScore],
  ["extreme_iv_penalty", (r) => r.research.extremeIvPenalty],
  ["tail_risk_score", (r) => r.research.tailRiskScore],
  ["execution_score", (r) => r.research.executionScore],
  ["research_confidence", (r) => r.research.confidence],
  ["fundamental_source", (r) => r.fundamentals.source],
  ["fundamental_period_end", (r) => r.fundamentals.asOf ?? ""],
  ["pe_ttm", (r) => r.fundamentals.peTtm ?? ""],
  ["effective_pe", (r) => r.research.effectivePe ?? ""],
  ["normalized_pe", (r) => r.fundamentals.normalizedPe ?? ""],
  ["effective_normalized_pe", (r) => r.research.effectiveNormalizedPe ?? ""],
  ["earnings_cycle_ratio", (r) => r.fundamentals.earningsCycleRatio ?? ""],
  ["annual_history_years", (r) => r.fundamentals.annualHistoryYears],
  ["ev_ebitda_ttm", (r) => r.fundamentals.evEbitdaTtm ?? ""],
  ["price_to_fcf_ttm", (r) => r.fundamentals.priceToFcfTtm ?? ""],
  ["roic_ttm", (r) => r.fundamentals.roicTtm ?? ""],
  ["operating_margin_ttm", (r) => r.fundamentals.operatingMarginTtm ?? ""],
  ["net_debt_to_ebitda_ttm", (r) => r.fundamentals.netDebtToEbitdaTtm ?? ""],
  ["missing_evidence", (r) => r.research.missingEvidence.join(" | ")],
];

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function rowsToCsv(rows: ResearchRow[]): string {
  const header = COLUMNS.map(([name]) => name).join(",");
  const lines = rows.map((row) =>
    COLUMNS.map(([, pick]) => csvCell(pick(row))).join(","),
  );
  return [header, ...lines].join("\n");
}

export function downloadCsv(rows: ResearchRow[], filename: string) {
  const blob = new Blob([rowsToCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
