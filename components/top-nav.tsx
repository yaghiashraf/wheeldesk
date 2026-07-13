"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Disc3, Menu, X } from "lucide-react";
import { NavSearch } from "@/components/nav-search";

const LINKS = [
  { href: "/cash-secured-puts", label: "Cash-Secured Puts" },
  { href: "/covered-calls", label: "Covered Calls" },
  { href: "/symbols", label: "Symbols" },
  { href: "/learn", label: "Learn" },
  { href: "/faq", label: "FAQ" },
];

export function TopNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-desk/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[96rem] items-center gap-3 px-4 sm:px-6 md:gap-6">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label="Toggle navigation"
          className="rounded-md p-1.5 text-ink-2 hover:bg-panel-2 hover:text-ink md:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Disc3 className="h-5 w-5 text-cyan" aria-hidden />
          <span className="font-semibold tracking-tight">
            Wheel<span className="text-cyan">Desk</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative whitespace-nowrap rounded-md px-3 py-1.5 transition-colors hover:bg-panel-2 hover:text-ink ${
                pathname === link.href ? "text-cyan" : "text-ink-2"
              }`}
            >
              {link.label}
              {pathname === link.href ? (
                <span className="absolute inset-x-3 -bottom-[0.72rem] h-px bg-cyan" />
              ) : null}
            </Link>
          ))}
        </nav>
        <NavSearch />
      </div>
      {menuOpen ? (
        <nav className="absolute inset-x-0 top-full grid border-b border-edge bg-panel p-2 shadow-2xl md:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-panel-2 ${
                pathname === link.href ? "text-cyan" : "text-ink-2 hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
