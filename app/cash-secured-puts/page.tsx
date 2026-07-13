import type { Metadata } from "next";
import { Suspense } from "react";
import { ScreenerView } from "@/components/screener-view";

export const metadata: Metadata = {
  title: "Cash-Secured Put Underwriter",
  description:
    "Underwrite cash-secured puts with sector-relative valuation and quality, IV/RV, execution liquidity, carry, event gaps, and contract-level economics.",
};

export default function CashSecuredPutsPage() {
  return (
    <Suspense>
      <ScreenerView strategy="csp" />
    </Suspense>
  );
}
