import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TopNav } from "@/components/top-nav";
import { SiteFooter } from "@/components/site-footer";
import { SwRegister } from "@/components/sw-register";
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
  appleWebApp: {
    capable: true,
    title: "WheelDesk",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
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
        <SwRegister />
        <TopNav />
        <main className="mx-auto w-full max-w-[96rem] flex-1 px-4 sm:px-6">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
