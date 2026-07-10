"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

/** Jump to any US ticker's wheel workbench — not limited to the universe. */
export function NavSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <form
      className="relative ml-auto shrink-0"
      onSubmit={(event) => {
        event.preventDefault();
        const symbol = query.trim().toUpperCase().replace(/[^A-Z.]/g, "");
        if (!symbol) return;
        setQuery("");
        router.push(`/ticker/${symbol}`);
      }}
    >
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Ticker"
        aria-label="Open a ticker's wheel workbench"
        className="num w-24 rounded-md border border-edge bg-panel-2 py-1.5 pl-8 pr-2 text-xs uppercase text-ink placeholder:normal-case placeholder:text-ink-3 outline-none transition-[width] focus:w-32 focus:border-cyan/60"
      />
    </form>
  );
}
