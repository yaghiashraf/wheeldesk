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
    default: "WheelDesk — Options Underwriting Scanner",
    template: "%s · WheelDesk",
  },
  description:
    "Institutional-style options underwriting: effective-basis valuation, cycle-normalized earnings, tail resilience, volatility richness, execution, and explicit data gaps.",
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
