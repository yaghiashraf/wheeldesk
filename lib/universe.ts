import type { SymbolMeta } from "@/lib/types";

/**
 * Tier 1A of VORTEX_WATCHLIST.md — the only names doctrine permits a fresh
 * cash-secured put on. Curation is the first quality gate: every entry is a
 * business we would accept assignment in, not merely one with a fat chain.
 *
 * This list is the watchlist, not a market sample. Tier 1A-Pending, Tier 2 and
 * Tier 3 are deliberately absent; adding a name here asserts it passed the
 * Section E overlay. Keep it in sync with the watchlist revision date below.
 *
 * Synced with VORTEX_WATCHLIST.md revision 2026-08-07.
 */
export const UNIVERSE: SymbolMeta[] = [
  // Mega-cap tech
  { symbol: "AAPL", name: "Apple", sector: "Technology", kind: "stock" },
  { symbol: "MSFT", name: "Microsoft", sector: "Technology", kind: "stock" },
  { symbol: "NVDA", name: "NVIDIA", sector: "Technology", kind: "stock" },
  { symbol: "AMZN", name: "Amazon", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "GOOGL", name: "Alphabet", sector: "Communication Services", kind: "stock" },
  { symbol: "META", name: "Meta Platforms", sector: "Communication Services", kind: "stock" },
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
  { symbol: "MA", name: "Mastercard", sector: "Financials", kind: "stock" },
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
  { symbol: "SPY", name: "SPDR S&P 500 ETF", sector: "ETF - Broad Market", kind: "etf" },
  { symbol: "QQQ", name: "Invesco QQQ", sector: "ETF - Broad Market", kind: "etf" },
  { symbol: "IWM", name: "iShares Russell 2000", sector: "ETF - Broad Market", kind: "etf" },
  { symbol: "DIA", name: "SPDR Dow Jones ETF", sector: "ETF - Broad Market", kind: "etf" },
  { symbol: "VTI", name: "Vanguard Total Stock Market", sector: "ETF - Broad Market", kind: "etf" },
  { symbol: "XLF", name: "Financial Select SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLE", name: "Energy Select SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLV", name: "Health Care Select SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLI", name: "Industrial Select SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLU", name: "Utilities Select SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLY", name: "Consumer Discretionary SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLC", name: "Communication Services SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLRE", name: "Real Estate Select SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "SMH", name: "VanEck Semiconductor ETF", sector: "ETF - Sector", kind: "etf" },
  { symbol: "GLD", name: "SPDR Gold Shares", sector: "ETF - Commodity", kind: "etf" },
  { symbol: "SLV", name: "iShares Silver Trust", sector: "ETF - Commodity", kind: "etf" },
  { symbol: "DBC", name: "Invesco DB Commodity Index", sector: "ETF - Commodity", kind: "etf" },
  { symbol: "TLT", name: "iShares 20+ Year Treasury", sector: "ETF - Rates", kind: "etf" },
  { symbol: "HYG", name: "iShares High Yield Corporate", sector: "ETF - Rates", kind: "etf" },
  { symbol: "LQD", name: "iShares Investment Grade Corporate", sector: "ETF - Rates", kind: "etf" },
  { symbol: "EEM", name: "iShares MSCI Emerging Markets", sector: "ETF - International", kind: "etf" },
];

export const UNIVERSE_SYMBOLS = UNIVERSE.map((meta) => meta.symbol);

const PEER_GROUPS: Array<[string, Set<string>]> = [
  ["Semiconductors · equipment", new Set(["AMAT"])],
  ["Semiconductors · analog", new Set(["TXN"])],
  ["Semiconductors · foundry", new Set(["TSM"])],
  ["Semiconductors · connectivity", new Set(["QCOM"])],
  ["Banks", new Set(["JPM", "BAC", "WFC", "C", "MS"])],
  ["Payments", new Set(["V", "MA", "AXP"])],
  ["Capital markets", new Set(["SCHW"])],
  ["Integrated oil", new Set(["XOM", "CVX", "COP", "OXY"])],
  ["Oil services", new Set(["SLB", "HAL"])],
  ["Exploration & production", new Set(["EQT", "DVN"])],
  ["Biopharma", new Set(["MRK", "ABBV", "PFE", "BMY", "AMGN", "GILD", "NVO"])],
  ["Medical products", new Set(["JNJ", "ABT"])],
  ["Managed care", new Set(["UNH"])],
  ["Telecom", new Set(["TMUS", "VZ", "T", "CMCSA"])],
  ["Enterprise software", new Set(["MSFT", "ORCL", "IBM", "CSCO"])],
  ["Consumer staples", new Set(["PG", "KO", "PEP", "MO", "PM"])],
  ["Discount retail", new Set(["TGT", "ROST", "DG"])],
  ["Home improvement", new Set(["HD", "LOW"])],
  ["Parcel & logistics", new Set(["UPS", "FDX"])],
  ["Aerospace & defense", new Set(["RTX", "GE"])],
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
