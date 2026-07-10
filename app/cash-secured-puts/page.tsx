import type { Metadata } from "next";
import { Suspense } from "react";
import { ScreenerView } from "@/components/screener-view";

export const metadata: Metadata = {
  title: "Cash-Secured Put Screener",
  description:
    "Screen liquid US optionable names for cash-secured puts: delta, DTE, ROC, annualized yield, P(ITM), IV/RV, earnings flags, and a wheel-fit score.",
};

export default function CashSecuredPutsPage() {
  return (
    <Suspense>
      <ScreenerView strategy="csp" />
    </Suspense>
  );
}
