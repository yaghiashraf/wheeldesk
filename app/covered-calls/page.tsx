import type { Metadata } from "next";
import { Suspense } from "react";
import { ScreenerView } from "@/components/screener-view";

export const metadata: Metadata = {
  title: "Covered Call Underwriter",
  description:
    "Underwrite covered calls with sector-relative company factors, IV/RV, execution liquidity, carry, event gaps, and contract-level economics.",
};

export default function CoveredCallsPage() {
  return (
    <Suspense>
      <ScreenerView strategy="cc" />
    </Suspense>
  );
}
