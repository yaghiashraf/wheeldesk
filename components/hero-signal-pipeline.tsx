import { CircleDot, Radar, ShieldAlert, ShieldCheck } from "lucide-react";

const CONTACTS = [
  { id: "032", x: "69%", y: "29%", status: "advance", label: "1.18× move" },
  { id: "087", x: "29%", y: "43%", status: "review", label: "P44 value" },
  { id: "104", x: "57%", y: "72%", status: "gated", label: "cycle risk" },
  { id: "119", x: "77%", y: "59%", status: "review", label: "edge thin" },
] as const;

const CANDIDATES = [
  {
    id: "Signal 032",
    status: "ADVANCE",
    detail: "Buffer clears 1.18× expected move",
    tone: "teal",
  },
  {
    id: "Signal 087",
    status: "REVIEW",
    detail: "Effective valuation at peer P44",
    tone: "amber",
  },
  {
    id: "Signal 104",
    status: "GATED",
    detail: "Peak-cycle earnings fail durability",
    tone: "coral",
  },
] as const;

/** Instrument-style illustration of candidates resolving as the universe is swept. */
export function HeroSignalPipeline() {
  return (
    <div
      className="radar-console relative overflow-hidden border border-edge-2 bg-panel"
      aria-label="Illustration of WheelDesk scanning and classifying option candidates"
    >
      <div className="flex items-center justify-between border-b border-edge px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Radar className="h-4 w-4 text-cyan" strokeWidth={1.5} aria-hidden />
          <div>
            <p className="text-xs font-semibold text-ink">Candidate radar</p>
            <p className="num mt-0.5 text-[9px] uppercase tracking-[0.14em] text-ink-3">
              144-name underwriting universe
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 text-[10px] text-teal">
          <span className="h-1.5 w-1.5 rounded-full bg-teal shadow-[0_0_8px_rgba(0,212,170,0.8)]" />
          Sweep active
        </span>
      </div>

      <div className="grid min-h-[25rem] lg:grid-cols-[1.35fr_0.65fr]">
        <div className="relative flex min-h-[25rem] items-center justify-center overflow-hidden border-b border-edge px-5 py-6 lg:border-b-0 lg:border-r">
          <div className="radar-ambient" aria-hidden />
          <div className="radar-display" aria-hidden>
            <div className="radar-axis radar-axis-x" />
            <div className="radar-axis radar-axis-y" />
            <div className="radar-sweep" />
            <div className="radar-center" />
            {CONTACTS.map((contact) => (
              <div
                key={contact.id}
                className={`radar-contact radar-contact-${contact.status}`}
                style={{ left: contact.x, top: contact.y }}
              >
                <span className="radar-contact-dot" />
                <span className="radar-contact-label">{contact.id}</span>
              </div>
            ))}
          </div>
          <span className="num absolute left-5 top-5 text-[9px] uppercase tracking-[0.14em] text-ink-3">
            Risk-adjusted contacts
          </span>
          <span className="num absolute bottom-5 left-5 text-[9px] text-ink-3">270°</span>
          <span className="num absolute bottom-5 right-5 text-[9px] text-ink-3">090°</span>
        </div>

        <aside className="flex min-w-0 flex-col bg-desk/35">
          <div className="border-b border-edge px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-2">
              Detected candidates
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-ink-3">
              Illustrative states—not live recommendations.
            </p>
          </div>

          <div className="flex-1">
            {CANDIDATES.map((candidate) => (
              <div key={candidate.id} className="border-b border-edge px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="num text-[10px] text-ink">{candidate.id}</span>
                  <span
                    className={`num text-[9px] font-semibold ${
                      candidate.tone === "teal"
                        ? "text-teal"
                        : candidate.tone === "amber"
                          ? "text-amber"
                          : "text-coral"
                    }`}
                  >
                    {candidate.status}
                  </span>
                </div>
                <p className="mt-2 text-[10px] leading-relaxed text-ink-2">{candidate.detail}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2.5 border-t border-edge px-4 py-4">
            <div className="flex items-center gap-2 text-[9px] text-ink-3">
              <ShieldCheck className="h-3.5 w-3.5 text-teal" aria-hidden />
              Advance survives every capital gate
            </div>
            <div className="flex items-center gap-2 text-[9px] text-ink-3">
              <CircleDot className="h-3.5 w-3.5 text-amber" aria-hidden />
              Review requires deeper diligence
            </div>
            <div className="flex items-center gap-2 text-[9px] text-ink-3">
              <ShieldAlert className="h-3.5 w-3.5 text-coral" aria-hidden />
              Gated cannot rank above viable names
            </div>
          </div>
        </aside>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-edge px-4 py-3 text-[9px] uppercase tracking-[0.12em] text-ink-3">
        <span>Assignment</span>
        <span className="text-edge-2">/</span>
        <span>Tail</span>
        <span className="text-edge-2">/</span>
        <span>Volatility</span>
        <span className="text-edge-2">/</span>
        <span>Execution</span>
        <span className="num ml-auto text-cyan">One sweep · four capital gates</span>
      </div>
    </div>
  );
}
