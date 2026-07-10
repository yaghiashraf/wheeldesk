import type { MetadataRoute } from "next";
import { UNIVERSE_SYMBOLS } from "@/lib/universe";

const BASE = "https://wheeldesk-beta.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["", "/cash-secured-puts", "/covered-calls", "/symbols", "/learn", "/faq"].map(
    (path) => ({
      url: `${BASE}${path}`,
      changeFrequency: "daily" as const,
      priority: path === "" ? 1 : 0.8,
    }),
  );
  const tickerPages = UNIVERSE_SYMBOLS.map((symbol) => ({
    url: `${BASE}/ticker/${symbol}`,
    changeFrequency: "daily" as const,
    priority: 0.5,
  }));
  return [...staticPages, ...tickerPages];
}
