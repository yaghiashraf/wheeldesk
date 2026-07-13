import { ArrowRight, Check, Database, ShieldCheck, Waves } from "lucide-react";

const STAGES = [
  {
    index: "1 / 4",
    title: "Universe",
    summary: "144 liquid names",
    icon: Database,
    rows: [
      ["AAPL", "chain loaded"],
      ["MSFT", "chain loaded"],
      ["XOM", "chain loaded"],
    ],
  },
  {
    index: "2 / 4",
    title: "Assignment underwrite",
    summary: "Normalize fundamentals",
    icon: ShieldCheck,
    rows: [
      ["Valuation", "vs sector"],
      ["Quality", "profit + cash"],
      ["Leverage", "downside gate"],
    ],
  },
  {
    index: "3 / 4",
    title: "Volatility edge",
    summary: "Price the option",
    icon: Waves,
    rows: [
      ["IV / RV30", "relative edge"],
      ["IV / IV30", "skew proxy"],
      ["Carry", "risk-adjusted"],
    ],
  },
  {
    index: "4 / 4",
    title: "Execution gate",
    summary: "Only rank what trades",
    icon: Check,
    rows: [
      ["Spread", "inside mandate"],
      ["Open interest", "capacity check"],
      ["Events", "known risk"],
    ],
  },
];

/** Functional hero demo: the animation explains the scanner's signal path. */
export function HeroSignalPipeline() {
  return (
    <div className="signal-demo relative overflow-hidden border border-edge-2 bg-panel" aria-label="WheelDesk research pipeline demonstration">
      <div className="signal-demo-trace" aria-hidden />
      <div className="grid min-h-[29rem] sm:grid-cols-2 xl:grid-cols-4">
        {STAGES.map((stage, index) => (
          <section
            key={stage.title}
            className={`signal-stage relative border-b border-edge p-4 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0 signal-stage-${index + 1}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="num text-[10px] text-cyan">{stage.index}</p>
                <h2 className="mt-2 text-xs font-semibold text-ink">{stage.title}</h2>
                <p className="mt-1 text-[10px] text-ink-3">{stage.summary}</p>
              </div>
              <stage.icon className="h-4 w-4 text-cyan" strokeWidth={1.5} aria-hidden />
            </div>

            <div className="mt-7 border-y border-edge py-1">
              {stage.rows.map(([label, value], rowIndex) => (
                <div
                  key={label}
                  className={`signal-row signal-row-${rowIndex + 1} flex items-center justify-between gap-3 border-b border-edge/70 px-1 py-2.5 last:border-b-0`}
                >
                  <span className="num text-[10px] text-ink">{label}</span>
                  <span className="num text-[9px] text-ink-3">{value}</span>
                </div>
              ))}
            </div>

            <div className="absolute inset-x-4 bottom-4 flex items-center justify-between border-t border-edge pt-3">
              <span className="num text-[9px] uppercase tracking-[0.14em] text-ink-3">
                {index === STAGES.length - 1 ? "Qualified candidate" : "Pass to next gate"}
              </span>
              {index === STAGES.length - 1 ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-teal">
                  Auditable <Check className="h-3 w-3" />
                </span>
              ) : (
                <ArrowRight className="h-3.5 w-3.5 text-cyan" aria-hidden />
              )}
            </div>
          </section>
        ))}
      </div>
      <div className="flex items-center gap-3 border-t border-edge px-4 py-3 text-[9px] uppercase tracking-[0.13em] text-ink-3">
        <span>Signal path</span>
        <span className="h-px flex-1 bg-edge" />
        <span className="num text-cyan">Universe → assignment → volatility → execution</span>
      </div>
    </div>
  );
}

