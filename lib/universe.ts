import type { SymbolMeta, WatchlistTier } from "@/lib/types";

type Listing = Omit<SymbolMeta, "tier">;

/**
 * Tier 1A of VORTEX_WATCHLIST.md — the only names doctrine permits a fresh
 * cash-secured put on. Curation is the first quality gate: every entry is a
 * business we would accept assignment in, not merely one with a fat chain.
 * Adding a name here asserts it passed the Section E overlay.
 *
 * Synced with VORTEX_WATCHLIST.md revision 2026-09-08.
 */
const TIER_1A: Listing[] = [
  // Mega-cap tech
  { symbol: "AAPL", name: "Apple", sector: "Technology", kind: "stock" },
  { symbol: "MSFT", name: "Microsoft", sector: "Technology", kind: "stock" },
  { symbol: "NVDA", name: "NVIDIA", sector: "Technology", kind: "stock" },
  { symbol: "AMZN", name: "Amazon", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "GOOGL", name: "Alphabet", sector: "Communication Services", kind: "stock" },
  { symbol: "NFLX", name: "Netflix", sector: "Communication Services", kind: "stock" },

  // Semis (trimmed sleeve)
  { symbol: "TXN", name: "Texas Instruments", sector: "Semiconductors", kind: "stock" },
  { symbol: "AMAT", name: "Applied Materials", sector: "Semiconductors", kind: "stock" },
  { symbol: "TSM", name: "Taiwan Semiconductor", sector: "Semiconductors", kind: "stock" },
  { symbol: "QCOM", name: "Qualcomm", sector: "Semiconductors", kind: "stock" },

  // Value tech
  { symbol: "CSCO", name: "Cisco Systems", sector: "Technology", kind: "stock" },
  { symbol: "IBM", name: "IBM", sector: "Technology", kind: "stock" },
  { symbol: "ORCL", name: "Oracle", sector: "Technology", kind: "stock" },

  // Financials
  { symbol: "JPM", name: "JPMorgan Chase", sector: "Financials", kind: "stock" },
  { symbol: "BAC", name: "Bank of America", sector: "Financials", kind: "stock" },
  { symbol: "WFC", name: "Wells Fargo", sector: "Financials", kind: "stock" },
  { symbol: "C", name: "Citigroup", sector: "Financials", kind: "stock" },
  { symbol: "MS", name: "Morgan Stanley", sector: "Financials", kind: "stock" },
  { symbol: "SCHW", name: "Charles Schwab", sector: "Financials", kind: "stock" },
  { symbol: "V", name: "Visa", sector: "Financials", kind: "stock" },
  { symbol: "AXP", name: "American Express", sector: "Financials", kind: "stock" },

  // Healthcare
  { symbol: "UNH", name: "UnitedHealth Group", sector: "Healthcare", kind: "stock" },
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare", kind: "stock" },
  { symbol: "MRK", name: "Merck", sector: "Healthcare", kind: "stock" },
  { symbol: "ABBV", name: "AbbVie", sector: "Healthcare", kind: "stock" },
  { symbol: "PFE", name: "Pfizer", sector: "Healthcare", kind: "stock" },
  { symbol: "ABT", name: "Abbott Laboratories", sector: "Healthcare", kind: "stock" },
  { symbol: "BMY", name: "Bristol-Myers Squibb", sector: "Healthcare", kind: "stock" },
  { symbol: "GILD", name: "Gilead Sciences", sector: "Healthcare", kind: "stock" },
  { symbol: "AMGN", name: "Amgen", sector: "Healthcare", kind: "stock" },
  { symbol: "NVO", name: "Novo Nordisk", sector: "Healthcare", kind: "stock" },

  // Energy
  { symbol: "XOM", name: "Exxon Mobil", sector: "Energy", kind: "stock" },
  { symbol: "CVX", name: "Chevron", sector: "Energy", kind: "stock" },
  { symbol: "COP", name: "ConocoPhillips", sector: "Energy", kind: "stock" },
  { symbol: "SLB", name: "Schlumberger", sector: "Energy", kind: "stock" },
  { symbol: "OXY", name: "Occidental Petroleum", sector: "Energy", kind: "stock" },
  { symbol: "EQT", name: "EQT Corporation", sector: "Energy", kind: "stock" },
  { symbol: "HAL", name: "Halliburton", sector: "Energy", kind: "stock" },
  { symbol: "DVN", name: "Devon Energy", sector: "Energy", kind: "stock" },

  // Industrials
  { symbol: "HON", name: "Honeywell", sector: "Industrials", kind: "stock" },
  { symbol: "RTX", name: "RTX Corporation", sector: "Industrials", kind: "stock" },
  { symbol: "GE", name: "GE Aerospace", sector: "Industrials", kind: "stock" },
  { symbol: "UPS", name: "United Parcel Service", sector: "Industrials", kind: "stock" },
  { symbol: "FDX", name: "FedEx", sector: "Industrials", kind: "stock" },

  // Materials & precious metals
  { symbol: "CF", name: "CF Industries", sector: "Materials", kind: "stock" },
  { symbol: "AA", name: "Alcoa", sector: "Materials", kind: "stock" },
  { symbol: "WPM", name: "Wheaton Precious Metals", sector: "Materials", kind: "stock" },
  { symbol: "LIN", name: "Linde", sector: "Materials", kind: "stock" },

  // Consumer
  { symbol: "MCD", name: "McDonald's", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "HD", name: "Home Depot", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "LOW", name: "Lowe's", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "TGT", name: "Target", sector: "Consumer Staples", kind: "stock" },
  { symbol: "NKE", name: "Nike", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "PEP", name: "PepsiCo", sector: "Consumer Staples", kind: "stock" },
  { symbol: "KO", name: "Coca-Cola", sector: "Consumer Staples", kind: "stock" },
  { symbol: "PG", name: "Procter & Gamble", sector: "Consumer Staples", kind: "stock" },
  { symbol: "MO", name: "Altria Group", sector: "Consumer Staples", kind: "stock" },
  { symbol: "PM", name: "Philip Morris International", sector: "Consumer Staples", kind: "stock" },
  { symbol: "WM", name: "Waste Management", sector: "Industrials", kind: "stock" },
  { symbol: "ROST", name: "Ross Stores", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "DG", name: "Dollar General", sector: "Consumer Staples", kind: "stock" },

  // Communications
  { symbol: "TMUS", name: "T-Mobile US", sector: "Communication Services", kind: "stock" },
  { symbol: "CMCSA", name: "Comcast", sector: "Communication Services", kind: "stock" },
  { symbol: "VZ", name: "Verizon", sector: "Communication Services", kind: "stock" },
  { symbol: "T", name: "AT&T", sector: "Communication Services", kind: "stock" },
  { symbol: "DIS", name: "Walt Disney", sector: "Communication Services", kind: "stock" },
  { symbol: "EBAY", name: "eBay", sector: "Consumer Discretionary", kind: "stock" },

  // Cyclical — red-day only, watch leverage
  { symbol: "DAL", name: "Delta Air Lines", sector: "Industrials", kind: "stock" },

  // ETFs — lean on these, per watchlist
  { symbol: "IWM", name: "iShares Russell 2000", sector: "ETF - Broad Market", kind: "etf" },
  { symbol: "VTI", name: "Vanguard Total Stock Market", sector: "ETF - Broad Market", kind: "etf" },
  { symbol: "XLF", name: "Financial Select SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLE", name: "Energy Select SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLV", name: "Health Care Select SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLI", name: "Industrial Select SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLU", name: "Utilities Select SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLY", name: "Consumer Discretionary SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLC", name: "Communication Services SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLRE", name: "Real Estate Select SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "GLD", name: "SPDR Gold Shares", sector: "ETF - Commodity", kind: "etf" },
  { symbol: "SLV", name: "iShares Silver Trust", sector: "ETF - Commodity", kind: "etf" },
  { symbol: "DBC", name: "Invesco DB Commodity Index", sector: "ETF - Commodity", kind: "etf" },
  { symbol: "TLT", name: "iShares 20+ Year Treasury", sector: "ETF - Rates", kind: "etf" },
  { symbol: "HYG", name: "iShares High Yield Corporate", sector: "ETF - Rates", kind: "etf" },
  { symbol: "LQD", name: "iShares Investment Grade Corporate", sector: "ETF - Rates", kind: "etf" },
  { symbol: "EEM", name: "iShares MSCI Emerging Markets", sector: "ETF - International", kind: "etf" },
];

/**
 * The rest of the IBKR watchlist, tier-gated. These are scanned for covered
 * calls by default and for puts only on request, where every row is gated with
 * its doctrine reason instead of being ranked as if it were 1A.
 */
const OTHER_TIERS: SymbolMeta[] = [
  // Tier 1B — one contract breaches the 20% ticker cap (2026-09-08 recompute)
  { symbol: "META", name: "Meta Platforms", sector: "Communication Services", kind: "stock", tier: "1B", proxy: "XLC" },
  { symbol: "MA", name: "Mastercard", sector: "Financials", kind: "stock", tier: "1B", proxy: "XLF" },
  { symbol: "MU", name: "Micron Technology", sector: "Semiconductors", kind: "stock", tier: "1B", proxy: "SMH" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", sector: "ETF - Broad Market", kind: "etf", tier: "1B", proxy: "IWM or VTI" },
  { symbol: "QQQ", name: "Invesco QQQ", sector: "ETF - Broad Market", kind: "etf", tier: "1B" },
  { symbol: "DIA", name: "SPDR Dow Jones ETF", sector: "ETF - Broad Market", kind: "etf", tier: "1B", proxy: "IWM or VTI" },
  { symbol: "SMH", name: "VanEck Semiconductor ETF", sector: "ETF - Sector", kind: "etf", tier: "1B" },

  // Tier 1A-Pending — staged; fundamentals not yet through Section E
  { symbol: "INTC", name: "Intel", sector: "Semiconductors", kind: "stock", tier: "1A-pending" },
  { symbol: "WDC", name: "Western Digital", sector: "Technology", kind: "stock", tier: "1A-pending" },
  { symbol: "CVS", name: "CVS Health", sector: "Healthcare", kind: "stock", tier: "1A-pending" },

  // Tier 2 — rich, own-only
  { symbol: "AMD", name: "Advanced Micro Devices", sector: "Semiconductors", kind: "stock", tier: "own-only" },
  { symbol: "AVGO", name: "Broadcom", sector: "Semiconductors", kind: "stock", tier: "own-only" },
  { symbol: "MRVL", name: "Marvell Technology", sector: "Semiconductors", kind: "stock", tier: "own-only" },
  { symbol: "TSLA", name: "Tesla", sector: "Consumer Discretionary", kind: "stock", tier: "own-only" },
  { symbol: "NOW", name: "ServiceNow", sector: "Technology", kind: "stock", tier: "own-only" },
  { symbol: "CRWD", name: "CrowdStrike", sector: "Technology", kind: "stock", tier: "own-only" },

  // Bad Bank — covered-call repair only
  { symbol: "COIN", name: "Coinbase", sector: "Financials", kind: "stock", tier: "bad-bank" },
  { symbol: "HOOD", name: "Robinhood Markets", sector: "Financials", kind: "stock", tier: "bad-bank" },
  { symbol: "SOFI", name: "SoFi Technologies", sector: "Financials", kind: "stock", tier: "bad-bank" },
  { symbol: "PLTR", name: "Palantir Technologies", sector: "Technology", kind: "stock", tier: "bad-bank" },
  { symbol: "IBIT", name: "iShares Bitcoin Trust", sector: "ETF - Crypto", kind: "etf", tier: "bad-bank" },

  // Tier 3 — cut
  { symbol: "APP", name: "AppLovin", sector: "Technology", kind: "stock", tier: "cut" },
  { symbol: "SHOP", name: "Shopify", sector: "Technology", kind: "stock", tier: "cut" },

  // Rejected 2026-06-22
  { symbol: "SMCI", name: "Super Micro Computer", sector: "Technology", kind: "stock", tier: "rejected" },
  { symbol: "LRCX", name: "Lam Research", sector: "Semiconductors", kind: "stock", tier: "rejected" },

  // On the IBKR watchlist but not yet reviewed against the doctrine
  { symbol: "INTU", name: "Intuit", sector: "Technology", kind: "stock", tier: "untiered" },
  { symbol: "SNDK", name: "Sandisk", sector: "Technology", kind: "stock", tier: "untiered" },
  { symbol: "SPCX", name: "Space Exploration Technologies", sector: "Industrials", kind: "stock", tier: "untiered" },
];

/** 1A first, so a cursor scan over every tier surfaces eligible names earliest. */
export const UNIVERSE: SymbolMeta[] = [
  ...TIER_1A.map((meta) => ({ ...meta, tier: "1A" as const })),
  ...OTHER_TIERS,
];

export const UNIVERSE_SYMBOLS = UNIVERSE.map((meta) => meta.symbol);

const CSP_ELIGIBLE = UNIVERSE.filter((meta) => meta.tier === "1A");

/** The cursor scan list: Tier 1A alone unless every tier is requested. */
export function scanUniverse(allTiers: boolean): SymbolMeta[] {
  return allTiers ? UNIVERSE : CSP_ELIGIBLE;
}

export const WATCHLIST_TIER_LABEL: Record<WatchlistTier, string> = {
  "1A": "1A",
  "1A-pending": "1A pending",
  "1B": "1B",
  "own-only": "Own-only",
  cut: "Cut",
  "bad-bank": "Bad bank",
  rejected: "Rejected",
  untiered: "Untiered",
};

/** Why doctrine refuses a fresh cash-secured put; null for Tier 1A. */
export function cspTierBlock(tier: WatchlistTier, proxy: string | null): string | null {
  if (tier === "1A") return null;
  if (tier === "1A-pending") return "Watchlist 1A-Pending: staged until the Section E fundamentals check clears, so no fresh put";
  if (tier === "1B") {
    return proxy
      ? `Watchlist 1B: one contract breaches the 20% ticker cap; doctrine routes puts to ${proxy}`
      : "Watchlist 1B: one contract breaches the 20% ticker cap and doctrine names no cheaper proxy";
  }
  if (tier === "own-only") return "Watchlist Tier 2 (own-only): valuation blocks fresh puts; covered calls only";
  if (tier === "bad-bank") return "Watchlist Bad Bank: covered-call repair only, no new puts";
  if (tier === "cut") return "Watchlist Tier 3 (cut): not ownable at the strike, so no puts";
  if (tier === "rejected") return "Rejected from the watchlist: no puts";
  return "Not yet tiered in the watchlist: no put eligibility until reviewed";
}

const PEER_GROUPS: Array<[string, Set<string>]> = [
  ["Semiconductors · equipment", new Set(["AMAT", "LRCX"])],
  ["Semiconductors · processors & networking", new Set(["AMD", "INTC", "AVGO", "MRVL"])],
  ["Memory & storage", new Set(["MU", "WDC", "SNDK"])],
  ["Semiconductors · analog", new Set(["TXN"])],
  ["Semiconductors · foundry", new Set(["TSM"])],
  ["Semiconductors · connectivity", new Set(["QCOM"])],
  ["Banks", new Set(["JPM", "BAC", "WFC", "C", "MS"])],
  ["Payments", new Set(["V", "MA", "AXP"])],
  ["Brokerage & crypto", new Set(["COIN", "HOOD", "SOFI"])],
  ["Capital markets", new Set(["SCHW"])],
  ["Integrated oil", new Set(["XOM", "CVX", "COP", "OXY"])],
  ["Oil services", new Set(["SLB", "HAL"])],
  ["Exploration & production", new Set(["EQT", "DVN"])],
  ["Biopharma", new Set(["MRK", "ABBV", "PFE", "BMY", "AMGN", "GILD", "NVO"])],
  ["Medical products", new Set(["JNJ", "ABT"])],
  ["Managed care", new Set(["UNH", "CVS"])],
  ["Telecom", new Set(["TMUS", "VZ", "T", "CMCSA"])],
  ["Enterprise software", new Set(["MSFT", "ORCL", "IBM", "CSCO"])],
  ["Growth software", new Set(["NOW", "CRWD", "INTU", "PLTR", "APP", "SHOP"])],
  ["Consumer staples", new Set(["PG", "KO", "PEP", "MO", "PM"])],
  ["Discount retail", new Set(["TGT", "ROST", "DG"])],
  ["Home improvement", new Set(["HD", "LOW"])],
  ["Parcel & logistics", new Set(["UPS", "FDX"])],
  ["Aerospace & defense", new Set(["RTX", "GE", "SPCX"])],
  ["Mining & materials", new Set(["CF", "AA", "WPM"])],
];

/** Deliberately explicit cohorts; sector fallback is disclosed by the ranker. */
export function getPeerGroup(meta: SymbolMeta): string {
  for (const [label, symbols] of PEER_GROUPS) {
    if (symbols.has(meta.symbol)) return label;
  }
  return meta.sector;
}

const BY_SYMBOL = new Map(UNIVERSE.map((meta) => [meta.symbol, meta]));

export function getSymbolMeta(symbol: string): SymbolMeta | undefined {
  return BY_SYMBOL.get(symbol.toUpperCase());
}

export function isInUniverse(symbol: string): boolean {
  return BY_SYMBOL.has(symbol.toUpperCase());
}
