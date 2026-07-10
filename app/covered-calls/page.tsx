import type { Metadata } from "next";
import { Suspense } from "react";
import { ScreenerView } from "@/components/screener-view";

export const metadata: Metadata = {
  title: "Covered Call Screener",
  description:
    "Screen liquid US optionable names for covered calls: delta, DTE, ROC, annualized yield, P(ITM), IV/RV, ex-dividend flags, and a wheel-fit score.",
};

export default function CoveredCallsPage() {
  return (
    <Suspense>
      <ScreenerView strategy="cc" />
    </Suspense>
  );
}
