import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "WheelDesk Pro",
    short_name: "WheelDeskPro",
    description:
      "Cash-secured put and covered-call scanner with premium, ROI, assignment sizing, and ticker workbenches.",
    start_url: "/cash-secured-puts",
    scope: "/",
    display: "standalone",
    background_color: "#07080a",
    theme_color: "#07080a",
    orientation: "any",
    categories: ["finance", "productivity", "utilities"],
    lang: "en",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "CSP Scanner",
        short_name: "CSPs",
        description: "Scan cash-secured put candidates.",
        url: "/cash-secured-puts",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Covered Calls",
        short_name: "Calls",
        description: "Scan covered-call candidates.",
        url: "/covered-calls",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Watchlist",
        short_name: "Watchlist",
        description: "Open the tracked symbol universe.",
        url: "/symbols",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
