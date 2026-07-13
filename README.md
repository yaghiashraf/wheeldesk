# WheelDesk

An options-underwriting research terminal for cash-secured puts and covered
calls across a curated universe of liquid US stocks and ETFs, with a per-ticker
workbench. Zero signup, no database, no auth.

## Features

- **CSP + covered-call underwriters** — delayed chains with vendor greeks/IV,
  P(ITM), ROC + annualized, IV/RV, buffer, spread, OI, and explicit event gaps
- **Assignment research** — current market-cap valuation against sector peers,
  quality and leverage factors, a transparent four-pillar composite, and no
  neutral score when reported company data is missing
- **Explicit mandate controls** — contract, assignment, execution, and event
  constraints are independently adjustable; VIX is context, not a hidden tuner
- **Ticker workbench** (`/ticker/AAPL`) — put/call strike ladders in the delta
  band, annualized yield curve by strike, 6-month price with candidate strikes,
  30-day realized vol vs current IV
- **Shareable scans** — filters encoded in the URL; CSV export; last-used filters
  persisted in localStorage
- **Progressive scanning** — the universe is scanned in cursor batches that
  stream into the table

## Data

Runs keyless on public delayed option data, daily history, and current market
capitalizations with TTM company factors derived from the latest four reported
quarters. Optional environment variables upgrade it:

| Variable | Effect |
| --- | --- |
| `APCA_API_KEY_ID` / `APCA_API_SECRET_KEY` | Real-time spot prices; Alpaca chain path on ticker pages |
| `FMP_API_KEY` | Earnings and ex-dividend event flags |

Missing evidence is surfaced as a data gap and reduces confidence; missing
fundamentals never receive a neutral valuation score. P(ITM) is a Black-Scholes
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
