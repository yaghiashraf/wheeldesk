import type { Metadata } from "next";
import Link from "next/link";
import { UNIVERSE } from "@/lib/universe";

export const metadata: Metadata = {
  title: "Symbols Covered",
  description:
    "The curated WheelDesk universe: liquid, optionable US stocks and ETFs screened for the wheel strategy, grouped by sector.",
};

export default function SymbolsPage() {
  const sectors = [...new Set(UNIVERSE.map((meta) => meta.sector))];

  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Symbols covered</h1>
      <p className="mt-1 max-w-2xl text-sm text-ink-2">
        {UNIVERSE.length} liquid, optionable names — curation is the first quality
        gate. Every symbol links to its wheel workbench with strike ladders and
        volatility context.
      </p>

      {sectors.map((sector) => (
        <section key={sector} className="mt-8">
          <h2 className="text-[11px] uppercase tracking-wider text-ink-3">{sector}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {UNIVERSE.filter((meta) => meta.sector === sector).map((meta) => (
              <Link
                key={meta.symbol}
                href={`/ticker/${meta.symbol}`}
                className="group rounded-lg border border-edge bg-panel px-3 py-2 transition-colors hover:border-cyan/40 hover:bg-panel-2"
              >
                <span className="num font-semibold text-cyan group-hover:underline">
                  {meta.symbol}
                </span>
                <span className="block truncate text-xs text-ink-3">{meta.name}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
