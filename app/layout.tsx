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
  metadataBase: new URL("https://wheeldeskpro.vercel.app"),
  applicationName: "WheelDesk Pro",
  title: {
    default: "WheelDesk Pro — CSP Scanner",
    template: "%s · WheelDesk Pro",
  },
  description:
    "Cash-secured put and covered-call scanner with premium dollars, ROI on strike, assignment sizing, price context, and explicit data gaps.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "WheelDesk Pro",
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#07080a",
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
