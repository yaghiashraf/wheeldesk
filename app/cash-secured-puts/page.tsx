import type { Metadata } from "next";
import { Suspense } from "react";
import { ScreenerView } from "@/components/screener-view";

export const metadata: Metadata = {
  title: "Cash-Secured Put Scanner",
  description:
    "Screen, underwrite, stress-test, and capital-check cash-secured puts with explicit valuation, evidence, liquidity, and event gaps.",
};

export default function CashSecuredPutsPage() {
  return (
    <Suspense>
      <ScreenerView strategy="csp" />
    </Suspense>
  );
}
