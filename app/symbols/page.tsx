import type { Metadata } from "next";
import Link from "next/link";
import { UNIVERSE, WATCHLIST_TIER_LABEL } from "@/lib/universe";
import type { SymbolMeta, WatchlistTier } from "@/lib/types";

export const metadata: Metadata = {
  title: "Symbols Covered",
  description:
    "The WheelDesk watchlist: liquid, optionable US stocks and ETFs, tiered for cash-secured put eligibility and covered-call repair.",
};

const TIER_SECTIONS: Array<{ tier: WatchlistTier; note: string }> = [
  { tier: "1A", note: "Fresh cash-secured puts permitted. The default put scan covers only these." },
  { tier: "1A-pending", note: "Staged. No put until the Section E fundamentals check clears." },
  { tier: "1B", note: "Quality, but one contract breaches the 20% ticker cap. Puts route to the proxy." },
  { tier: "own-only", note: "Valuation blocks fresh puts. Covered calls only." },
  { tier: "bad-bank", note: "Covered-call repair only, at or above the assignment floor." },
  { tier: "cut", note: "Premium bait: not ownable at the strike." },
  { tier: "rejected", note: "Rejected from the watchlist." },
  { tier: "untiered", note: "On the IBKR watchlist, not yet reviewed against the doctrine." },
];

function SymbolCard({ meta }: { meta: SymbolMeta }) {
  return (
    <Link
      href={`/ticker/${meta.symbol}`}
      className="group rounded-lg border border-edge bg-panel px-3 py-2 transition-colors hover:border-cyan/40 hover:bg-panel-2"
    >
      <span className="num font-semibold text-cyan group-hover:underline">{meta.symbol}</span>
      {meta.proxy ? <span className="num ml-1.5 text-[10px] text-ink-3">→ {meta.proxy}</span> : null}
      <span className="block truncate text-xs text-ink-3">{meta.name}</span>
    </Link>
  );
}

export default function SymbolsPage() {
  const eligible = UNIVERSE.filter((meta) => meta.tier === "1A");
  const sectors = [...new Set(eligible.map((meta) => meta.sector))];

  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Symbols covered</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-2">
        {UNIVERSE.length} liquid, optionable names, tiered by the watchlist doctrine.{" "}
        {eligible.length} are Tier 1A and eligible for fresh cash-secured puts; the covered-call
        scanner covers every tier. Each symbol links to its wheel workbench.
      </p>

      {TIER_SECTIONS.map(({ tier, note }) => {
        const members = UNIVERSE.filter((meta) => meta.tier === tier);
        if (members.length === 0) return null;
        return (
          <section key={tier} className="mt-10">
            <h2 className="text-base font-semibold tracking-tight text-ink">
              {tier === "1A" ? "Tier 1A" : WATCHLIST_TIER_LABEL[tier]}
              <span className="num ml-2 text-xs font-normal text-ink-3">{members.length}</span>
            </h2>
            <p className="mt-0.5 text-xs text-ink-3">{note}</p>
            {tier === "1A" ? (
              sectors.map((sector) => (
                <div key={sector} className="mt-5">
                  <h3 className="text-[11px] uppercase tracking-wider text-ink-3">{sector}</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {eligible
                      .filter((meta) => meta.sector === sector)
                      .map((meta) => (
                        <SymbolCard key={meta.symbol} meta={meta} />
                      ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {members.map((meta) => (
                  <SymbolCard key={meta.symbol} meta={meta} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
