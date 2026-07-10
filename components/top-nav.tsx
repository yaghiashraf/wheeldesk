import Link from "next/link";
import { Disc3 } from "lucide-react";
import { NavSearch } from "@/components/nav-search";

const LINKS = [
  { href: "/cash-secured-puts", label: "Cash-Secured Puts" },
  { href: "/covered-calls", label: "Covered Calls" },
  { href: "/symbols", label: "Symbols" },
  { href: "/learn", label: "Learn" },
  { href: "/faq", label: "FAQ" },
];

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-desk/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Disc3 className="h-5 w-5 text-cyan" aria-hidden />
          <span className="font-semibold tracking-tight">
            Wheel<span className="text-cyan">Desk</span>
          </span>
        </Link>
        <nav className="scroller flex items-center gap-1 overflow-x-auto text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-ink-2 transition-colors hover:bg-panel-2 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <NavSearch />
      </div>
    </header>
  );
}
