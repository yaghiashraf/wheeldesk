import type { Metadata } from "next";
import { Suspense } from "react";
import { ScreenerView } from "@/components/screener-view";

export const metadata: Metadata = {
  title: "Cash-Secured Put Underwriter",
  description:
    "Underwrite cash-secured puts with effective-basis valuation, cycle-normalized earnings, expected-move coverage, volatility richness, liquidity, and event gates.",
};

export default function CashSecuredPutsPage() {
  return (
    <Suspense>
      <ScreenerView strategy="csp" />
    </Suspense>
  );
}
