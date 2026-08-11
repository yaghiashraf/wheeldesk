import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Offline",
  description: "WheelDesk is offline. Cached pages remain available; market data does not.",
};

/**
 * Shown by the service worker when a navigation fails with no network. The
 * point is to state plainly that nothing on screen is priceable right now —
 * an installed desk that opens to a stale-looking shell is worse than one that
 * says it has no feed.
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl flex-col justify-center px-6 py-16">
      <p className="num text-[11px] uppercase tracking-[0.18em] text-amber">No connection</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink">The desk is offline.</h1>
      <p className="mt-4 text-sm leading-relaxed text-ink-2">
        WheelDesk never caches quotes, chains, or greeks — a cached price is a wrong price. The
        interface is available offline, but no contract on it can be underwritten until the
        connection returns.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/cash-secured-puts"
          className="rounded border border-cyan/40 bg-cyan/10 px-4 py-2 text-sm text-cyan transition hover:bg-cyan/20"
        >
          Retry cash-secured puts
        </Link>
        <Link
          href="/"
          className="rounded border border-edge-2 px-4 py-2 text-sm text-ink-2 transition hover:border-edge-2 hover:text-ink"
        >
          Back to the desk
        </Link>
      </div>
    </main>
  );
}
