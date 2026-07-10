import type { ScreenerRow } from "@/lib/types";

const COLUMNS: Array<[string, (row: ScreenerRow) => string | number]> = [
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
  ["spread_pct", (r) => r.spreadPct ?? ""],
  ["roc", (r) => r.roc],
  ["roc_annualized", (r) => r.rocAnnualized],
  ["prob_itm", (r) => r.pItm ?? ""],
  ["breakeven", (r) => r.breakeven],
  ["otm_pct", (r) => r.otmPct],
  ["open_interest", (r) => r.openInterest ?? ""],
  ["earnings_in_window", (r) => r.earningsDate ?? ""],
  ["ex_div_in_window", (r) => r.exDivDate ?? ""],
  ["score", (r) => r.score],
];

export function rowsToCsv(rows: ScreenerRow[]): string {
  const header = COLUMNS.map(([name]) => name).join(",");
  const lines = rows.map((row) =>
    COLUMNS.map(([, pick]) => String(pick(row))).join(","),
  );
  return [header, ...lines].join("\n");
}

export function downloadCsv(rows: ScreenerRow[], filename: string) {
  const blob = new Blob([rowsToCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
