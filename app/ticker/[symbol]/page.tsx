import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PriceChart } from "@/components/charts/price-chart";
import { VolChart } from "@/components/charts/vol-chart";
import { YieldCurveChart } from "@/components/charts/yield-curve-chart";
import { LadderTable } from "@/components/ladder-table";
import { fmtDateTime, fmtMoney, fmtPct } from "@/lib/format";
import { getTickerData } from "@/lib/ticker";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ symbol: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { symbol } = await params;
  const upper = symbol.toUpperCase();
  return {
    title: `${upper} Wheel Workbench`,
    description: `Cash-secured put and covered call strike ladders, premium yield curves, and IV vs realized volatility for ${upper}.`,
  };
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-edge bg-panel px-4 py-3" title={hint}>
      <p className="text-[11px] uppercase tracking-wider text-ink-3">{label}</p>
      <p className="num mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

export default async function TickerPage({ params }: Params) {
  const { symbol } = await params;
  const data = await getTickerData(symbol);
  if (!data) notFound();

  const candidateStrikes = data.putLadders[0]
    ? data.putLadders[0].rows
        .filter((row) => row.absDelta !== null && row.absDelta >= 0.1 && row.absDelta <= 0.3)
        .map((row) => row.strike)
        .slice(0, 4)
    : [];

  return (
    <div className="py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-ink-3">
            <Link href="/symbols" className="hover:text-ink">
              Symbols
            </Link>{" "}
            / {data.sector}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {data.symbol}
            <span className="ml-3 text-lg font-normal text-ink-2">{data.name}</span>
          </h1>
        </div>
        <p className="text-xs text-ink-3">
          {data.source === "alpaca" ? "Real-time spot · " : "Delayed quotes · "}
          as of {fmtDateTime(data.asOf)}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Spot" value={fmtMoney(data.spot)} />
        <StatTile
          label="IV 30d"
          value={fmtPct(data.iv30, 0)}
          hint="30-day implied volatility of the underlying"
        />
        <StatTile
          label="RV 30d"
          value={fmtPct(data.rv30, 0)}
          hint="Realized volatility of the last 30 trading days, annualized"
        />
        <StatTile
          label="IV / RV"
          value={data.ivRv?.toFixed(2) ?? "—"}
          hint="Above ~1.2 the market is paying up for options relative to how the stock has actually moved — richer premium for sellers"
        />
      </div>

      {/* Charts */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {data.bars.length > 0 && (
          <section className="rounded-xl border border-edge bg-panel p-4">
            <h2 className="text-sm font-medium">6-month price · candidate put strikes</h2>
            <p className="mb-2 text-xs text-ink-3">
              Teal levels are front-expiration strikes inside the 0.10–0.30 Δ band.
            </p>
            <PriceChart bars={data.bars} spot={data.spot} strikes={candidateStrikes} />
          </section>
        )}
        {data.rvSeries.length > 0 && (
          <section className="rounded-xl border border-edge bg-panel p-4">
            <h2 className="text-sm font-medium">Realized vol vs current implied</h2>
            <p className="mb-2 text-xs text-ink-3">
              When the magenta IV line sits above realized, sellers are being paid a
              volatility premium.
            </p>
            <VolChart rvSeries={data.rvSeries} iv30={data.iv30} />
          </section>
        )}
      </div>

      {/* Puts */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">
          Cash-secured puts
          <span className="ml-2 text-sm font-normal text-ink-3">
            strikes in the 0.08–0.35 Δ band, next {data.putLadders.length} expirations
          </span>
        </h2>
        {data.putLadders[0] && (
          <div className="mt-4 rounded-xl border border-edge bg-panel p-4">
            <h3 className="text-sm font-medium">Annualized premium yield by strike</h3>
            <p className="mb-2 text-xs text-ink-3">
              What each strike pays per year of collateral, per expiration.
            </p>
            <YieldCurveChart ladders={data.putLadders} spot={data.spot} />
          </div>
        )}
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {data.putLadders.map((ladder) => (
            <LadderTable key={ladder.expiration} ladder={ladder} />
          ))}
          {data.putLadders.length === 0 && (
            <p className="text-sm text-ink-3">
              No put strikes with live bids in the delta band right now.
            </p>
          )}
        </div>
      </section>

      {/* Calls */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">
          Covered calls
          <span className="ml-2 text-sm font-normal text-ink-3">
            for shares you hold — or the exit side after assignment
          </span>
        </h2>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {data.callLadders.map((ladder) => (
            <LadderTable key={ladder.expiration} ladder={ladder} />
          ))}
          {data.callLadders.length === 0 && (
            <p className="text-sm text-ink-3">
              No call strikes with live bids in the delta band right now.
            </p>
          )}
        </div>
      </section>

      <p className="mt-10 text-xs leading-relaxed text-ink-3">
        P(ITM) is a Black-Scholes model estimate from each contract&apos;s implied
        volatility, not a market-observed value. ROC = mid premium ÷ collateral
        (strike for puts, spot for calls); annualized at 365/DTE. Educational
        tooling, not investment advice.
      </p>
    </div>
  );
}
