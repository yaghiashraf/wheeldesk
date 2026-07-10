import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Learn the Wheel",
  description:
    "How the wheel strategy works, what every screener metric means, how the wheel-fit score is computed, and how presets adapt to the VIX regime.",
};

const GLOSSARY: Array<[string, string]> = [
  [
    "Score",
    "Wheel-fit score, 0–100. The sum of six components (see formula below) minus event penalties. Built to rank premium-selling candidates, not to predict direction.",
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
    "(Ask − bid) ÷ mid. Wide spreads are a hidden tax on entry and exit; the presets cap it.",
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
  ["Period yield", "25", "ROC for the period, scaled — 3%+ maxes it out."],
  ["Annualized", "15", "Annualized ROC, scaled — ~21%+ maxes it out."],
  [
    "Delta fit",
    "20",
    "Peaks at 0.20 Δ, full credit inside 0.10–0.30, decays fast outside the band.",
  ],
  ["Liquidity", "15", "Open interest on a log scale (10) plus spread tightness (5)."],
  ["IV richness", "10", "IV/RV of 0.8 scores zero; 1.6+ maxes it out. Neutral 4 when history is unavailable."],
  ["OTM buffer", "10", "1.2 points per percent out of the money, capped."],
  [
    "Event penalty",
    "−12 / −4",
    "−12 when earnings land inside the window; −4 for ex-div inside a covered-call window.",
  ],
];

export default function LearnPage() {
  return (
    <div className="prose-desk py-8">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">Learn the wheel</h1>
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

        <h2 className="mt-10 text-xl font-semibold">The wheel-fit score, exactly</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          The score is deterministic — same inputs, same number. Components sum to a
          0–100 scale:
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-edge">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge bg-panel text-left text-[11px] uppercase tracking-wider text-ink-3">
                <th className="px-4 py-2 font-medium">Component</th>
                <th className="px-4 py-2 font-medium">Max</th>
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
          Hover any score in the table to see its breakdown. A 70+ is rare and usually
          means rich IV with real liquidity; 50–70 is a solid wheel candidate; below
          35 the premium probably isn&apos;t paying for the risk.
        </p>

        <h2 className="mt-10 text-xl font-semibold">Presets and the VIX regime</h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          The three presets — <strong className="text-ink">Wheel</strong> (30–45 DTE,
          0.10–0.30 Δ, the default), <strong className="text-ink">Conservative</strong>{" "}
          (0.08–0.18 Δ, tighter spreads, deeper liquidity), and{" "}
          <strong className="text-ink">Balanced</strong> (0.15–0.30 Δ, 21–45 DTE) —
          adjust themselves to the live VIX: when the regime is{" "}
          <span className="text-amber">elevated</span> (VIX 20–28) the delta band
          shifts down ~0.03 and the ROC floor rises 25%, because the same premium is
          available further out of the money; when{" "}
          <span className="text-coral">stressed</span> (VIX 28+) it shifts down
          ~0.05–0.07 and the floor rises 50%. In a{" "}
          <span className="text-teal">calm</span> or{" "}
          <span className="text-cyan">normal</span> tape the presets run as written.
        </p>

        <h2 className="mt-10 text-xl font-semibold">A disciplined workflow</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-ink-2">
          <li>Open the <Link href="/cash-secured-puts" className="text-cyan hover:underline">CSP screener</Link>; keep the Wheel preset unless the tape argues otherwise.</li>
          <li>Only consider tickers you would hold through a drawdown — the screener ranks contracts, you rank companies.</li>
          <li>Check the events column: nothing with earnings inside the window unless that is a deliberate bet.</li>
          <li>Open the ticker workbench; confirm the strike sits below support you believe in, and the IV/RV says you&apos;re being paid.</li>
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
