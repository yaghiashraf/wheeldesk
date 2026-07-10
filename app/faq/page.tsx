import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Common questions about WheelDesk: data freshness, how the score works, filters, and what the tool does and doesn't do.",
};

const FAQS: Array<[string, string]> = [
  [
    "Is this free? Do I need an account?",
    "Yes and no. Every screener, workbench, and export is free with no signup. Your filter settings are saved in your own browser.",
  ],
  [
    "How fresh is the data?",
    "Option chains, greeks, and implied volatility are delayed roughly 15 minutes. Underlying spot prices are real-time when the live feed is available and delayed otherwise — the workbench header tells you which you're looking at.",
  ],
  [
    "Where do the numbers come from?",
    "Compiled from public market data by VCG Research. Delta, gamma, theta, vega, and IV come from the chain feed itself; P(ITM) is a Black-Scholes estimate computed from each contract's implied volatility and is labeled as a model value.",
  ],
  [
    "Why don't I see every stock?",
    "The universe is curated on purpose: liquid chains, real businesses, and ETFs deep enough to wheel. A thin chain makes every downstream number unreliable, so thin names don't get listed.",
  ],
  [
    "What does the score mean?",
    "It's a 0–100 wheel-fit ranking: period yield, annualized return, delta fit to the 0.10–0.30 band, liquidity, IV vs realized vol, and OTM buffer, minus penalties for earnings or ex-div dates inside the trade window. Hover any score for its exact breakdown, and see the Learn page for the formula.",
  ],
  [
    "Why did the preset values change since yesterday?",
    "Presets auto-tune to the VIX regime. When volatility is elevated the delta band shifts lower and the minimum ROC rises — same premium, more cushion. The chip at the top of each screener shows the live regime.",
  ],
  [
    "Some rows show — for IV/RV or events. Why?",
    "Because the real value isn't available at that moment — price history for realized vol, or an earnings calendar source. WheelDesk shows a dash rather than estimating; nothing on the screen is a made-up number.",
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
