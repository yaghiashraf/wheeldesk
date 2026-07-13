import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-edge">
      <div className="mx-auto w-full max-w-[96rem] px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div className="max-w-md space-y-2">
            <p className="text-sm font-semibold">
              Wheel<span className="text-cyan">Desk</span>
            </p>
            <p className="text-xs leading-relaxed text-ink-3">
              Screeners and analytics for the options wheel strategy. Educational
              tooling, not investment advice. Options involve substantial risk —
              assignment is a feature of the wheel, so only run it on names you
              want to own at the strike.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-xs text-ink-2">
            <Link href="/cash-secured-puts" className="hover:text-ink">
              Cash-Secured Put Screener
            </Link>
            <Link href="/covered-calls" className="hover:text-ink">
              Covered Call Screener
            </Link>
            <Link href="/symbols" className="hover:text-ink">
              Symbols Covered
            </Link>
            <Link href="/learn" className="hover:text-ink">
              Learn the Wheel
            </Link>
            <Link href="/faq" className="hover:text-ink">
              FAQ
            </Link>
          </nav>
        </div>
        <p className="mt-8 text-[11px] text-ink-3">
          VCG Research · Compiled from public market data. Underlying quotes may be
          delayed ~15 minutes. © {new Date().getFullYear()} Vortex Capital Group.
        </p>
      </div>
    </footer>
  );
}
