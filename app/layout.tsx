import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TopNav } from "@/components/top-nav";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://wheeldesk-beta.vercel.app"),
  title: {
    default: "WheelDesk — Wheel Strategy Screener",
    template: "%s · WheelDesk",
  },
  description:
    "Cash-secured put and covered call screener for the wheel strategy. Live chains, greeks, IV/RV, VIX-aware presets, and per-ticker wheel workbenches. Zero signup.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TopNav />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
