import Link from "next/link";
import { ArrowRight, CircleDollarSign, Repeat2, TrendingDown } from "lucide-react";
import { HeroWheel } from "@/components/hero-wheel";
import { RegimeChip } from "@/components/regime-chip";
import { getVixRegime } from "@/lib/providers/cboe";
import { UNIVERSE } from "@/lib/universe";
import type { RegimeInfo } from "@/lib/types";

export const revalidate = 300;

const STEPS = [
  {
    icon: TrendingDown,
    title: "1 · Sell a cash-secured put",
    body: "Pick a quality name you'd own anyway. Sell a 30–45 DTE put around 0.10–0.30 delta, fully backed by cash. Expires worthless? Keep the premium and repeat.",
  },
  {
    icon: CircleDollarSign,
    title: "2 · Get assigned, sell covered calls",
    body: "Assigned at the strike means you bought the stock at a discount you chose. Now sell calls above your basis and keep collecting premium while you hold.",
  },
  {
    icon: Repeat2,
    title: "3 · Called away, start over",
    body: "Shares get called away at the higher strike: you keep the appreciation plus every premium along the way. Roll the cash back into step one.",
  },
];

const FEATURES = [
  {
    title: "Wheel-fit scoring",
    body: "Every contract gets a 0–100 score built for premium sellers: period yield, annualized return, delta fit to the 0.10–0.30 band, liquidity, IV vs realized, and OTM buffer — with the full breakdown on hover.",
  },
  {
    title: "VIX-aware presets",
    body: "Conservative, Balanced, and Wheel presets retune their delta band and minimum ROC to the live volatility regime, so a calm tape and a stressed tape don't get the same defaults.",
  },
  {
    title: "Event flags inline",
    body: "Earnings and ex-dividend dates that land inside a trade's window are flagged on the row — the classic wheel blowup is a \"safe\" put through an earnings print.",
  },
  {
    title: "Per-ticker workbench",
    body: "Every symbol links to a wheel workbench: put and call strike ladders in the delta band, annualized yield curves by strike, and IV vs realized vol context.",
  },
  {
    title: "Shareable scans",
    body: "Filters live in the URL. Copy the link and your exact scan — band, DTE, ROC floor, all of it — opens for anyone. CSV export included.",
  },
  {
    title: "Zero signup",
    body: "No account, no credit card, no paywall. Open a screener and it scans the whole universe in front of you.",
  },
];

export default async function HomePage() {
  let regime: RegimeInfo | null = null;
  try {
    regime = await getVixRegime();
  } catch {
    // Landing still renders without the regime chip.
  }

  return (
    <div className="py-14">
      {/* Hero */}
      <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <RegimeChip regime={regime} />
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
          Run the wheel like a{" "}
          <span className="text-cyan">research desk</span>, not a spreadsheet.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
          WheelDesk screens {UNIVERSE.length} liquid US names and ETFs for
          cash-secured puts and covered calls — live chains with greeks, wheel-fit
          scoring, volatility-aware presets, and a per-ticker workbench. Free, no
          signup.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/cash-secured-puts"
            className="inline-flex items-center gap-2 rounded-lg bg-cyan px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Screen Cash-Secured Puts <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/covered-calls"
            className="inline-flex items-center gap-2 rounded-lg border border-edge-2 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-panel-2"
          >
            Screen Covered Calls
          </Link>
          <Link
            href="/learn"
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm text-ink-2 transition-colors hover:text-ink"
          >
            Learn the wheel first
          </Link>
        </div>
        </div>
        <div className="w-full shrink-0 lg:w-auto">
          <HeroWheel />
        </div>
      </div>

      {/* The wheel in three steps */}
      <section className="mt-20">
        <h2 className="text-xl font-semibold tracking-tight">The wheel, in three steps</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.title} className="rounded-xl border border-edge bg-panel p-5">
              <step.icon className="h-5 w-5 text-cyan" aria-hidden />
              <h3 className="mt-3 font-medium">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why this one */}
      <section className="mt-20">
        <h2 className="text-xl font-semibold tracking-tight">
          Built for how sellers actually trade
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-edge bg-panel p-5">
              <h3 className="font-medium text-cyan">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
