import Link from "next/link";
import { BrandMark, BrandWordmark } from "@/components/brand-mark";

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-edge">
      <div className="desk-meta mx-auto flex w-full max-w-[96rem] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 text-ink-3 sm:px-6">
        <p className="inline-flex items-center gap-2">
          <BrandMark className="h-5 w-5" />
          <BrandWordmark compact />
        </p>
        <p>Cboe delayed options · Nasdaq fundamentals · explicit data gaps</p>
        <nav className="ml-auto flex flex-wrap gap-x-4 gap-y-2 text-ink-2">
            <Link href="/cash-secured-puts" className="hover:text-ink">
              CSP Scanner
            </Link>
            <Link href="/covered-calls" className="hover:text-ink">
              Covered Calls
            </Link>
            <Link href="/symbols" className="hover:text-ink">
              Watchlist
            </Link>
            <Link href="/learn" className="hover:text-ink">
              Rules
            </Link>
        </nav>
      </div>
    </footer>
  );
}
