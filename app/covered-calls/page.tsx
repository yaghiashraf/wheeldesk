import type { Metadata } from "next";
import { Suspense } from "react";
import { ScreenerView } from "@/components/screener-view";

export const metadata: Metadata = {
  title: "Covered Call Scanner",
  description:
    "Screen, underwrite, stress-test, and capital-check covered calls with explicit volatility, execution, event, and evidence gaps.",
};

export default function CoveredCallsPage() {
  return (
    <Suspense>
      <ScreenerView strategy="cc" />
    </Suspense>
  );
}
