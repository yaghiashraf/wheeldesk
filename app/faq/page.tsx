import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Common questions about WheelDesk data, peer valuation, underwriting scores, filters, and limitations.",
};

const FAQS: Array<[string, string]> = [
  [
    "Is this free? Do I need an account?",
    "Yes and no. Every screener, workbench, and export is free with no signup. Your filter settings are saved in your own browser.",
  ],
  [
    "How fresh is the data?",
    "Option chains, greeks, and implied volatility are delayed. Company valuation combines current market capitalization with TTM figures derived from the latest four reported fiscal quarters. Every expanded underwrite shows its chain freeze and fiscal period.",
  ],
  [
    "Where do the numbers come from?",
    "Option chains and greeks come from Cboe's delayed feed. Reported company financials and current market capitalization come from Nasdaq's site data. P(ITM) is a Black-Scholes estimate computed from each contract's implied volatility and is labeled as a model value.",
  ],
  [
    "Why don't I see every stock?",
    "The universe is curated on purpose: liquid chains, real businesses, and ETFs deep enough to wheel. A thin chain makes every downstream number unreliable, so thin names don't get listed.",
  ],
  [
    "What does the score mean?",
    "It is a transparent 0–100 research ranking: 45% assignment quality, 25% volatility edge, 20% execution, and 10% carry. Assignment quality combines peer-relative valuation and company quality. Expand any row to see the factors, source periods, and missing evidence.",
  ],
  [
    "Does VIX change my filters?",
    "No. VIX is market context, not a hidden risk preset. The scanner uses exactly the DTE, delta, return, valuation, quality, liquidity, and event constraints shown in your research mandate.",
  ],
  [
    "Some rows show — for IV/RV or events. Why?",
    "Because the evidence is unavailable or not comparable. WheelDesk shows a data gap rather than fabricating a value. Missing fundamentals never receive a neutral valuation score, and an unavailable event calendar is labeled unknown rather than clear.",
  ],
  [
    "Can I share a scan?",
    "Yes. Your filters are encoded in the page URL — copy the address bar and the identical scan opens for whoever clicks it. CSV export is next to the filters.",
  ],
  [
    "Is this investment advice?",
    "No. WheelDesk is an educational screening tool. Options involve substantial risk including assignment and total loss of premium-secured capital. Do your own diligence and size positions so assignment is a plan, not a problem.",
  ],
];

export default function FaqPage() {
  return (
    <div className="py-8">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">FAQ</h1>
        <div className="mt-8 space-y-6">
          {FAQS.map(([question, answer]) => (
            <div key={question} className="rounded-xl border border-edge bg-panel p-5">
              <h2 className="font-medium">{question}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{answer}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-ink-2">
          New to the strategy? Start with{" "}
          <Link href="/learn" className="text-cyan hover:underline">
            Learn the wheel
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
