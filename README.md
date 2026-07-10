# WheelDesk

Screeners and analytics for the options wheel strategy: cash-secured puts and
covered calls across a curated universe of liquid US stocks and ETFs, with a
per-ticker wheel workbench. Zero signup, no database, no auth.

## Features

- **CSP + covered-call screeners** — live chains with vendor greeks/IV, wheel-fit
  score (0–100, breakdown on hover), P(ITM), ROC + annualized, IV/RV, buffer,
  spread, OI, earnings/ex-div event flags
- **VIX-aware presets** — Wheel (30–45 DTE, 0.10–0.30 Δ, default), Conservative,
  Balanced; delta band and ROC floor auto-tune to the live VIX regime
- **Ticker workbench** (`/ticker/AAPL`) — put/call strike ladders in the delta
  band, annualized yield curve by strike, 6-month price with candidate strikes,
  30-day realized vol vs current IV
- **Shareable scans** — filters encoded in the URL; CSV export; last-used filters
  persisted in localStorage
- **Progressive scanning** — the universe is scanned in cursor batches that
  stream into the table

## Data

Runs fully keyless out of the box on public delayed data (~15-minute chains,
full greeks and IV, daily history). Optional environment variables upgrade it:

| Variable | Effect |
| --- | --- |
| `APCA_API_KEY_ID` / `APCA_API_SECRET_KEY` | Real-time spot prices; Alpaca chain path on ticker pages |
| `FMP_API_KEY` | Earnings and ex-dividend event flags |

Missing data is always shown as `—`, never estimated. P(ITM) is a Black-Scholes
model value computed from each contract's IV and labeled as such.

## Stack

Next.js (App Router) · React · TypeScript strict · Tailwind CSS 4 · Recharts ·
lucide-react. All market-data fetching is server-side; keys never reach the client.

## Develop

```bash
npm install
npm run dev    # http://localhost:3000
npm run lint
npm run build
```

Copy `.env.example` to `.env.local` for the optional keys.

## Deploy

Push to GitHub, import in Vercel, add the optional env vars in project settings.
The app works with zero configuration.

---

Educational tooling, not investment advice. VCG Research · Compiled from public
market data.
