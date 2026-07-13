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
              Options-underwriting research for the wheel strategy. Educational
              tooling, not investment advice. Assignment is the core equity risk,
              so only sell puts on companies you can own at the strike.
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-xs text-ink-2">
            <Link href="/cash-secured-puts" className="hover:text-ink">
              Cash-Secured Put Underwriter
            </Link>
            <Link href="/covered-calls" className="hover:text-ink">
              Covered Call Underwriter
            </Link>
            <Link href="/symbols" className="hover:text-ink">
              Symbols Covered
            </Link>
            <Link href="/learn" className="hover:text-ink">
              Methodology
            </Link>
            <Link href="/faq" className="hover:text-ink">
              FAQ
            </Link>
          </nav>
        </div>
        <p className="mt-8 text-[11px] text-ink-3">
          Cboe delayed options · Nasdaq reported fundamentals · explicit data gaps.
          © {new Date().getFullYear()} Vortex Capital Group.
        </p>
      </div>
    </footer>
  );
}
