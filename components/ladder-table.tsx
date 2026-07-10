import { fmtDate, fmtMoney, fmtNum, fmtPct } from "@/lib/format";
import type { ExpirationLadder } from "@/lib/ticker";

/** A row sits in the wheel sweet spot when |delta| is inside the 0.10-0.30 band. */
function inBand(absDelta: number | null): boolean {
  return absDelta !== null && absDelta >= 0.1 && absDelta <= 0.3;
}

export function LadderTable({ ladder }: { ladder: ExpirationLadder }) {
  return (
    <div className="rounded-xl border border-edge bg-panel">
      <div className="flex items-baseline justify-between border-b border-edge px-4 py-2.5">
        <span className="text-sm font-medium">{fmtDate(ladder.expiration)}</span>
        <span className="num text-xs text-ink-3">{ladder.dte} DTE</span>
      </div>
      <div className="scroller overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-edge text-left text-[11px] uppercase tracking-wider text-ink-3">
              <th className="px-3 py-2 font-medium">Strike</th>
              <th className="px-3 py-2 font-medium">|Δ|</th>
              <th className="px-3 py-2 font-medium">Bid / Ask</th>
              <th className="px-3 py-2 font-medium">Mid</th>
              <th className="px-3 py-2 font-medium">ROC</th>
              <th className="px-3 py-2 font-medium">Ann.</th>
              <th className="px-3 py-2 font-medium">P(ITM)</th>
              <th className="px-3 py-2 font-medium">Breakeven</th>
              <th className="px-3 py-2 pr-4 font-medium">OI</th>
            </tr>
          </thead>
          <tbody>
            {ladder.rows.map((row) => (
              <tr
                key={row.occSymbol}
                className={`border-b border-edge/60 last:border-0 ${
                  inBand(row.absDelta) ? "bg-cyan/[0.04]" : ""
                }`}
              >
                <td className="num px-3 py-1.5 font-medium">
                  {fmtMoney(row.strike, row.strike % 1 === 0 ? 0 : 2)}
                  {inBand(row.absDelta) && (
                    <span className="ml-1.5 align-middle text-[9px] uppercase tracking-wider text-cyan">
                      band
                    </span>
                  )}
                </td>
                <td className="num px-3 py-1.5">{row.absDelta?.toFixed(2) ?? "—"}</td>
                <td className="num whitespace-nowrap px-3 py-1.5 text-ink-2">
                  {fmtMoney(row.bid)} / {fmtMoney(row.ask)}
                </td>
                <td className="num px-3 py-1.5 text-teal">{fmtMoney(row.mid)}</td>
                <td className="num px-3 py-1.5">{fmtPct(row.roc)}</td>
                <td className="num px-3 py-1.5 font-medium">{fmtPct(row.rocAnnualized)}</td>
                <td className="num px-3 py-1.5">{fmtPct(row.pItm, 0)}</td>
                <td className="num px-3 py-1.5">{fmtMoney(row.breakeven)}</td>
                <td className="num px-3 py-1.5 pr-4">{fmtNum(row.openInterest)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
