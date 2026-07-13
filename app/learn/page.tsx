import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How WheelDesk underwrites assignment risk with peer valuation, company quality, volatility edge, execution, carry, and explicit data confidence.",
};

const GLOSSARY: Array<[string, string]> = [
  [
    "Underwrite",
    "A 0–100 composite of assignment quality, volatility edge, execution, and carry. It ranks the loaded opportunity set; it does not predict direction or turn weak evidence into a neutral score.",
  ],
  [
    "|Δ| (Delta)",
    "Absolute option delta — a rough market-implied probability the option finishes in the money. 0.20 Δ ≈ assigned about one time in five. The wheel band is 0.10–0.30.",
  ],
  [
    "DTE",
    "Days to expiration. 30–45 DTE is the sweet spot: theta decay accelerates while there is still time to manage or roll the position.",
  ],
  [
    "Premium / Mid",
    "Midpoint of the live bid/ask, per share; the premium column shows it per contract (×100). Assume you fill somewhere between mid and the bid.",
  ],
  [
    "ROC",
    "Return on capital for the period: mid ÷ strike for cash-secured puts (your cash collateral), mid ÷ spot for covered calls (your stock capital).",
  ],
  [
    "Annualized",
    "ROC × 365 ÷ DTE. A comparison metric across expirations — not a promised yearly return; it assumes you could repeat the trade continuously.",
  ],
  [
    "Buffer",
    "How far out of the money the strike sits, as a percent of spot. Your cushion before the trade goes wrong.",
  ],
  [
    "P(ITM)",
    "Black-Scholes model probability the option expires in the money, computed from the contract's own implied volatility. A model estimate, labeled as such.",
  ],
  [
    "Breakeven",
    "Strike − premium for puts (your effective purchase price if assigned); spot − premium for covered calls (your downside cushion on the shares).",
  ],
  [
    "IV",
    "The contract's implied volatility — the market's priced-in expectation of movement, annualized.",
  ],
  [
    "IV/RV",
    "Implied vol ÷ 30-day realized vol of the underlying. Above ~1.2, options are pricing more movement than the stock has delivered — sellers are being paid a premium. Below ~0.8, premium is thin.",
  ],
  [
    "Spread",
    "(Ask − bid) ÷ mid. Wide spreads are a hidden tax on entry and exit; the execution mandate sets the maximum you will accept.",
  ],
  [
    "OI",
    "Open interest — outstanding contracts at that strike. Liquidity proxy; low OI means bad fills and painful exits.",
  ],
  [
    "Events",
    "Earnings (amber) or ex-dividend (teal) dates that land inside the trade's window. Earnings inside the window is the classic wheel blowup; ex-div inside a covered-call window raises early-assignment risk.",
  ],
];

const SCORE_ROWS: Array<[string, string, string]> = [
  [
    "Assignment quality",
    "45%",
    "55% sector-relative valuation and 45% company quality. Valuation and quality remain visible as separate factors.",
  ],
  [
    "Volatility edge",
    "25%",
    "Contract IV versus 30-day realized volatility; contract IV versus underlying IV30 is the fallback basis.",
  ],
  ["Execution", "20%", "45% open interest, 45% bid/ask tightness, and 10% contract volume."],
  ["Carry", "10%", "45% annualized ROC, 30% OTM buffer, 20% model P(OTM), and 5% event status."],
];

export default function LearnPage() {
  return (
    <div className="prose-desk py-8">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">Underwriting methodology</h1>
        <p className="mt-3 leading-relaxed text-ink-2">
          The wheel is a cycle: sell puts on stocks you want to own, get paid while
          you wait; if assigned, sell calls on the shares you now hold, and get paid
          while you wait to sell. It converts patience into premium — as long as you
          only run it on names you genuinely want at the strike.
        </p>

        <h2 className="mt-10 text-xl font-semibold">The cycle</h2>
        <ol className="mt-4 space-y-4 text-sm leading-relaxed text-ink-2">
          <li>
            <strong className="text-ink">1. Sell a cash-secured put.</strong> Choose a
            quality underlying, 30–45 DTE, 0.10–0.30 Δ, cash set aside for 100 shares
            at the strike. Two outcomes: it expires worthless (keep premium, go to 1)
            or you are assigned (go to 2). Either way the premium is yours.
          </li>
          <li>
            <strong className="text-ink">2. Sell covered calls.</strong> You now own
            shares at an effective basis of strike − premium. Sell calls above that
            basis — above the assigned strike if you can — and keep collecting. Two
            outcomes: they expire worthless (keep premium, go to 2) or the shares are
            called away (go to 3).
          </li>
          <li>
            <strong className="text-ink">3. Called away.</strong> You sold at the
            higher strike: strike appreciation plus every premium collected along the
            way. Return to step 1 with the cash.
          </li>
        </ol>

        <h2 className="mt-10 text-xl font-semibold">Every metric on the screener</h2>
        <div className="mt-4 overflow-hidden rounded-xl border border-edge">
          <table className="w-full text-sm">
            <tbody>
              {GLOSSARY.map(([term, definition]) => (
                <tr key={term} className="border-b border-edge/60 last:border-0">
                  <td className="w-32 px-4 py-3 align-top font-medium text-cyan">{term}</td>
                  <td className="px-4 py-3 leading-relaxed text-ink-2">{definition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-10 text-xl font-semibold">The underwrite score, exactly</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          The score is deterministic for a loaded opportunity set: the same contracts,
          reported fundamentals, and peer set produce the same result. Components sum
          to a 0–100 scale:
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-edge">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge bg-panel text-left text-[11px] uppercase tracking-wider text-ink-3">
                <th className="px-4 py-2 font-medium">Component</th>
                <th className="px-4 py-2 font-medium">Weight</th>
                <th className="px-4 py-2 font-medium">How it&apos;s earned</th>
              </tr>
            </thead>
            <tbody>
              {SCORE_ROWS.map(([name, max, how]) => (
                <tr key={name} className="border-b border-edge/60 last:border-0">
                  <td className="px-4 py-2.5 font-medium">{name}</td>
                  <td className="num px-4 py-2.5">{max}</td>
                  <td className="px-4 py-2.5 leading-relaxed text-ink-2">{how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          Expand a row to audit every factor, the peer percentile, source period, and
          missing evidence. A high composite is a research-priority signal, not an
          instruction to trade.
        </p>

        <h2 className="mt-10 text-xl font-semibold">Relative valuation and confidence</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          Stocks are compared with loaded companies in the same sector. Standard
          businesses use P/E, EV/EBITDA, and P/FCF; financials use P/E and price/book.
          Quality is independently ranked using profitability, cash conversion, and
          leverage factors appropriate to that sector. ETFs are explicitly marked N/A.
          A thin peer set, stale fiscal period, missing realized volatility, or an
          unavailable forward-event calendar is shown as missing evidence and lowers
          confidence. It is never silently converted into an average fundamental score.
        </p>

        <h2 className="mt-10 text-xl font-semibold">The mandate, not a preset</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          The wheel is the strategy, not a risk setting. WheelDesk starts with a visible
          research mandate, and every gate can be changed independently: DTE and delta,
          return floor, peer valuation ceiling, quality floor, spread, open interest,
          event handling, and contracts per symbol. VIX is displayed as market context;
          it does not secretly move the filters.
        </p>

        <h2 className="mt-10 text-xl font-semibold">A disciplined workflow</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-2">
          <li>Open the <Link href="/cash-secured-puts" className="text-cyan hover:underline">CSP underwriter</Link> and define the assignment, contract, and execution gates you intend to enforce.</li>
          <li>Start with valuation and quality. Only consider companies you would hold through a drawdown at the strike&apos;s effective purchase price.</li>
          <li>Audit the missing-evidence panel. An unavailable calendar is unknown risk, not evidence that the window is clear.</li>
          <li>Confirm IV/RV, liquidity, strike buffer, and scenario economics in the ticker workbench.</li>
          <li>Work the order between mid and bid. Never market-order options.</li>
          <li>Manage winners: closing at 50–60% of max profit and redeploying usually beats holding to expiry.</li>
          <li>If assigned, switch to the <Link href="/covered-calls" className="text-cyan hover:underline">covered-call screener</Link> and sell above your basis.</li>
        </ol>

        <h2 className="mt-10 text-xl font-semibold">What the wheel is not</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          It is not free money. The strategy&apos;s real risk is the stock, not the option:
          a cash-secured put is a limit buy order that pays you to wait, and a falling
          knife will fill it. Premium never compensates for owning a business you
          don&apos;t want. Position-size so assignment is an event, not an emergency —
          and remember annualized figures assume a repeatability the market doesn&apos;t
          owe you. Nothing here is investment advice.
        </p>
      </div>
    </div>
  );
}
