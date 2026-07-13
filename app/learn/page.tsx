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
    "A 0–100 diligence-priority composite with an explicit ADVANCE, REVIEW, GATED, or DATA GAP status. Binding tail, cycle, event, and volatility risks cap the score; a high number cannot override a hard gate.",
  ],
  [
    "|Δ| (Delta)",
    "Absolute option delta — a rough market-implied probability the option finishes in the money. 0.20 Δ ≈ assigned about one time in five. The wheel band is 0.10–0.30.",
  ],
  [
    "DTE",
    "Days to expiration. It controls theta, event exposure, and the volatility-scaled expected move; the mandate exposes the range directly rather than assuming one horizon is always optimal.",
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
    "For a CSP, spot minus the premium-adjusted breakeven, divided by spot. The scanner then divides that buffer by the IV-implied move over the actual DTE; below 0.75× is gated by default.",
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
    "Implied vol ÷ RV30. RV30 is the sample standard deviation of the latest 30 daily adjusted-close log returns, annualized by √252. Above ~1.2, options price more movement than the stock recently delivered; that is relative richness, not proof the option is mispriced.",
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
    "35%",
    "Effective-entry valuation, company quality, and—within cyclical sectors—multi-year earnings durability. Peak margins are not treated as permanent.",
  ],
  [
    "Tail resilience",
    "25%",
    "Premium-adjusted buffer divided by the expected move over the contract DTE, combined with model P(OTM).",
  ],
  ["Volatility edge", "15%", "IV/RV30 or contract IV/underlying IV30. Extreme absolute IV is penalized when relative richness is weak."],
  ["Execution", "15%", "45% open interest, 45% bid/ask tightness, and 10% contract volume."],
  ["Carry", "10%", "70% annualized ROC, 20% model P(OTM), and 10% event status. Carry is deliberately the smallest risk-bearing input."],
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
          The comparison universe includes every scanned stock, whether or not its option
          contract passes. Business-model cohorts are used when at least three observations
          exist; otherwise the exact sector fallback and denominator are disclosed. CSP
          multiples use the premium-adjusted breakeven basis. Semiconductors, energy, and
          materials use normalized P/E and P/FCF built from up to four annual median margins,
          so peak-cycle earnings do not look permanently cheap. Quality remains separate.
          Thin peers, missing realized volatility, or an unavailable event calendar lowers
          confidence and is never converted into an average score.
        </p>

        <h2 className="mt-10 text-xl font-semibold">The mandate, not a preset</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          The wheel is the strategy, not a risk setting. WheelDesk starts with a visible
          research mandate, and every gate can be changed independently: DTE and delta,
          return floor, expected-move coverage, peer valuation ceiling, quality floor,
          spread, open interest, event handling, and contracts per symbol. VIX is displayed as market context;
          it does not secretly move the filters.
        </p>

        <h2 className="mt-10 text-xl font-semibold">A disciplined workflow</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-2">
          <li>Open the <Link href="/cash-secured-puts" className="text-cyan hover:underline">CSP underwriter</Link> and define the assignment, contract, and execution gates you intend to enforce.</li>
          <li>Start with valuation and quality. Only consider companies you would hold through a drawdown at the strike&apos;s effective purchase price.</li>
          <li>Audit the missing-evidence panel. An unavailable calendar is unknown risk, not evidence that the window is clear.</li>
          <li>Confirm IV richness, liquidity, premium-adjusted buffer versus expected move, and scenario economics in the ticker workbench.</li>
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
