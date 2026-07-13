import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ChartNoAxesCombined,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { HeroSignalPipeline } from "@/components/hero-signal-pipeline";

const GATES = [
  {
    icon: ShieldCheck,
    title: "Assignment quality",
    body: "Would you own the shares at the breakeven? Test profitability, cash conversion, leverage, and the first downside mechanism.",
  },
  {
    icon: Scale,
    title: "Relative valuation",
    body: "Value the premium-adjusted entry against an independent business-model peer universe. Normalize cyclical margins instead of capitalizing the peak.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Volatility edge",
    body: "Measure the breakeven buffer against the DTE-scaled expected move. Penalize high absolute IV when it is not rich versus IV30 or realized volatility.",
  },
  {
    icon: CalendarClock,
    title: "Execution & events",
    body: "Gate spreads, open interest, volume, earnings, and ex-dividend dates. A theoretical edge that cannot be filled is not an edge.",
  },
];

export default function HomePage() {
  return (
    <div className="pb-20 pt-10 sm:pt-14">
      <section className="grid items-center gap-10 xl:grid-cols-[0.66fr_1.34fr] xl:gap-14">
        <div>
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-[-0.035em] sm:text-5xl xl:text-[3.45rem]">
            Underwrite the stock. Price the volatility. Then sell the put.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg">
            WheelDesk ranks cash-secured puts and covered calls across assignment
            quality, relative valuation, volatility edge, and execution—so premium
            never gets mistaken for alpha.
          </p>
          <div className="mt-8 grid max-w-md gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Link
              href="/cash-secured-puts"
              className="inline-flex h-12 items-center justify-between rounded bg-cyan px-5 text-sm font-semibold text-black transition-[opacity,transform] hover:opacity-90 active:translate-y-px"
            >
              Open CSP underwriter <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/covered-calls"
              className="inline-flex h-12 items-center justify-between rounded border border-cyan/70 px-5 text-sm font-medium text-cyan transition-colors hover:bg-cyan/10"
            >
              Open covered-call underwriter <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="num mt-5 text-[10px] leading-relaxed text-ink-3">
            Cboe delayed options · Nasdaq reported fundamentals · explicit data gaps
          </p>
        </div>

        <HeroSignalPipeline />
      </section>

      <section className="mt-16 sm:mt-20">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            One trade, four independent gates
          </h2>
          <Link href="/learn" className="inline-flex items-center gap-1.5 text-xs text-cyan hover:underline">
            View the scoring methodology <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="relative mt-8 grid border-t border-edge lg:grid-cols-4">
          {GATES.map((gate, index) => (
            <article key={gate.title} className="relative border-b border-edge py-7 pr-5 lg:border-b-0 lg:border-r lg:px-6 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0">
              <span className="absolute -top-1.5 left-0 h-3 w-3 rounded-full border border-cyan bg-desk lg:left-6 lg:first:left-0" />
              <div className="flex items-center gap-3">
                <span className="num text-[10px] text-ink-3">0{index + 1}</span>
                <gate.icon className="h-4 w-4 text-cyan" strokeWidth={1.5} aria-hidden />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-cyan">{gate.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-ink-2">{gate.body}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
