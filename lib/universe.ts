import type { SymbolMeta } from "@/lib/types";

/**
 * Curated wheel universe: liquid optionable US names and major ETFs.
 * Curation is the first quality gate — real businesses and deep chains only.
 * Add or remove entries here; everything else adapts.
 */
export const UNIVERSE: SymbolMeta[] = [
  // Mega-cap tech & platforms
  { symbol: "AAPL", name: "Apple", sector: "Technology", kind: "stock" },
  { symbol: "MSFT", name: "Microsoft", sector: "Technology", kind: "stock" },
  { symbol: "GOOGL", name: "Alphabet", sector: "Communication Services", kind: "stock" },
  { symbol: "AMZN", name: "Amazon", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "META", name: "Meta Platforms", sector: "Communication Services", kind: "stock" },
  { symbol: "NVDA", name: "NVIDIA", sector: "Technology", kind: "stock" },
  { symbol: "TSLA", name: "Tesla", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "NFLX", name: "Netflix", sector: "Communication Services", kind: "stock" },
  { symbol: "CRM", name: "Salesforce", sector: "Technology", kind: "stock" },
  { symbol: "ORCL", name: "Oracle", sector: "Technology", kind: "stock" },
  { symbol: "ADBE", name: "Adobe", sector: "Technology", kind: "stock" },
  { symbol: "NOW", name: "ServiceNow", sector: "Technology", kind: "stock" },
  { symbol: "IBM", name: "IBM", sector: "Technology", kind: "stock" },
  { symbol: "CSCO", name: "Cisco Systems", sector: "Technology", kind: "stock" },
  { symbol: "ACN", name: "Accenture", sector: "Technology", kind: "stock" },
  { symbol: "INTU", name: "Intuit", sector: "Technology", kind: "stock" },
  { symbol: "UBER", name: "Uber Technologies", sector: "Technology", kind: "stock" },
  { symbol: "SHOP", name: "Shopify", sector: "Technology", kind: "stock" },
  { symbol: "PLTR", name: "Palantir Technologies", sector: "Technology", kind: "stock" },
  { symbol: "SNOW", name: "Snowflake", sector: "Technology", kind: "stock" },
  { symbol: "PANW", name: "Palo Alto Networks", sector: "Technology", kind: "stock" },
  { symbol: "CRWD", name: "CrowdStrike", sector: "Technology", kind: "stock" },
  { symbol: "DELL", name: "Dell Technologies", sector: "Technology", kind: "stock" },

  // Semiconductors
  { symbol: "AMD", name: "Advanced Micro Devices", sector: "Semiconductors", kind: "stock" },
  { symbol: "AVGO", name: "Broadcom", sector: "Semiconductors", kind: "stock" },
  { symbol: "QCOM", name: "Qualcomm", sector: "Semiconductors", kind: "stock" },
  { symbol: "TXN", name: "Texas Instruments", sector: "Semiconductors", kind: "stock" },
  { symbol: "MU", name: "Micron Technology", sector: "Semiconductors", kind: "stock" },
  { symbol: "INTC", name: "Intel", sector: "Semiconductors", kind: "stock" },
  { symbol: "TSM", name: "Taiwan Semiconductor", sector: "Semiconductors", kind: "stock" },
  { symbol: "ASML", name: "ASML Holding", sector: "Semiconductors", kind: "stock" },
  { symbol: "LRCX", name: "Lam Research", sector: "Semiconductors", kind: "stock" },
  { symbol: "AMAT", name: "Applied Materials", sector: "Semiconductors", kind: "stock" },
  { symbol: "ARM", name: "Arm Holdings", sector: "Semiconductors", kind: "stock" },
  { symbol: "MRVL", name: "Marvell Technology", sector: "Semiconductors", kind: "stock" },

  // Financials
  { symbol: "JPM", name: "JPMorgan Chase", sector: "Financials", kind: "stock" },
  { symbol: "BAC", name: "Bank of America", sector: "Financials", kind: "stock" },
  { symbol: "WFC", name: "Wells Fargo", sector: "Financials", kind: "stock" },
  { symbol: "GS", name: "Goldman Sachs", sector: "Financials", kind: "stock" },
  { symbol: "MS", name: "Morgan Stanley", sector: "Financials", kind: "stock" },
  { symbol: "C", name: "Citigroup", sector: "Financials", kind: "stock" },
  { symbol: "SCHW", name: "Charles Schwab", sector: "Financials", kind: "stock" },
  { symbol: "BLK", name: "BlackRock", sector: "Financials", kind: "stock" },
  { symbol: "V", name: "Visa", sector: "Financials", kind: "stock" },
  { symbol: "MA", name: "Mastercard", sector: "Financials", kind: "stock" },
  { symbol: "AXP", name: "American Express", sector: "Financials", kind: "stock" },
  { symbol: "PYPL", name: "PayPal", sector: "Financials", kind: "stock" },
  { symbol: "COIN", name: "Coinbase", sector: "Financials", kind: "stock" },
  { symbol: "HOOD", name: "Robinhood Markets", sector: "Financials", kind: "stock" },
  { symbol: "SOFI", name: "SoFi Technologies", sector: "Financials", kind: "stock" },
  { symbol: "BRK.B", name: "Berkshire Hathaway", sector: "Financials", kind: "stock" },

  // Healthcare
  { symbol: "UNH", name: "UnitedHealth Group", sector: "Healthcare", kind: "stock" },
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare", kind: "stock" },
  { symbol: "LLY", name: "Eli Lilly", sector: "Healthcare", kind: "stock" },
  { symbol: "PFE", name: "Pfizer", sector: "Healthcare", kind: "stock" },
  { symbol: "MRK", name: "Merck", sector: "Healthcare", kind: "stock" },
  { symbol: "ABBV", name: "AbbVie", sector: "Healthcare", kind: "stock" },
  { symbol: "BMY", name: "Bristol-Myers Squibb", sector: "Healthcare", kind: "stock" },
  { symbol: "AMGN", name: "Amgen", sector: "Healthcare", kind: "stock" },
  { symbol: "GILD", name: "Gilead Sciences", sector: "Healthcare", kind: "stock" },
  { symbol: "CVS", name: "CVS Health", sector: "Healthcare", kind: "stock" },
  { symbol: "MRNA", name: "Moderna", sector: "Healthcare", kind: "stock" },
  { symbol: "ISRG", name: "Intuitive Surgical", sector: "Healthcare", kind: "stock" },
  { symbol: "MDT", name: "Medtronic", sector: "Healthcare", kind: "stock" },
  { symbol: "TMO", name: "Thermo Fisher Scientific", sector: "Healthcare", kind: "stock" },

  // Consumer
  { symbol: "WMT", name: "Walmart", sector: "Consumer Staples", kind: "stock" },
  { symbol: "COST", name: "Costco", sector: "Consumer Staples", kind: "stock" },
  { symbol: "PG", name: "Procter & Gamble", sector: "Consumer Staples", kind: "stock" },
  { symbol: "KO", name: "Coca-Cola", sector: "Consumer Staples", kind: "stock" },
  { symbol: "PEP", name: "PepsiCo", sector: "Consumer Staples", kind: "stock" },
  { symbol: "MCD", name: "McDonald's", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "SBUX", name: "Starbucks", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "NKE", name: "Nike", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "HD", name: "Home Depot", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "LOW", name: "Lowe's", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "TGT", name: "Target", sector: "Consumer Staples", kind: "stock" },
  { symbol: "DIS", name: "Walt Disney", sector: "Communication Services", kind: "stock" },
  { symbol: "ABNB", name: "Airbnb", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "BKNG", name: "Booking Holdings", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "CMG", name: "Chipotle Mexican Grill", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "LULU", name: "Lululemon Athletica", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "DKNG", name: "DraftKings", sector: "Consumer Discretionary", kind: "stock" },

  // Industrials, energy, materials
  { symbol: "CAT", name: "Caterpillar", sector: "Industrials", kind: "stock" },
  { symbol: "DE", name: "Deere & Company", sector: "Industrials", kind: "stock" },
  { symbol: "BA", name: "Boeing", sector: "Industrials", kind: "stock" },
  { symbol: "HON", name: "Honeywell", sector: "Industrials", kind: "stock" },
  { symbol: "GE", name: "GE Aerospace", sector: "Industrials", kind: "stock" },
  { symbol: "RTX", name: "RTX Corporation", sector: "Industrials", kind: "stock" },
  { symbol: "LMT", name: "Lockheed Martin", sector: "Industrials", kind: "stock" },
  { symbol: "UPS", name: "United Parcel Service", sector: "Industrials", kind: "stock" },
  { symbol: "FDX", name: "FedEx", sector: "Industrials", kind: "stock" },
  { symbol: "UNP", name: "Union Pacific", sector: "Industrials", kind: "stock" },
  { symbol: "XOM", name: "Exxon Mobil", sector: "Energy", kind: "stock" },
  { symbol: "CVX", name: "Chevron", sector: "Energy", kind: "stock" },
  { symbol: "COP", name: "ConocoPhillips", sector: "Energy", kind: "stock" },
  { symbol: "SLB", name: "Schlumberger", sector: "Energy", kind: "stock" },
  { symbol: "OXY", name: "Occidental Petroleum", sector: "Energy", kind: "stock" },
  { symbol: "FCX", name: "Freeport-McMoRan", sector: "Materials", kind: "stock" },
  { symbol: "NEM", name: "Newmont", sector: "Materials", kind: "stock" },
  { symbol: "LIN", name: "Linde", sector: "Materials", kind: "stock" },

  // Communication / autos / other large caps
  { symbol: "T", name: "AT&T", sector: "Communication Services", kind: "stock" },
  { symbol: "VZ", name: "Verizon", sector: "Communication Services", kind: "stock" },
  { symbol: "CMCSA", name: "Comcast", sector: "Communication Services", kind: "stock" },
  { symbol: "F", name: "Ford Motor", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "GM", name: "General Motors", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "RIVN", name: "Rivian Automotive", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "DAL", name: "Delta Air Lines", sector: "Industrials", kind: "stock" },
  { symbol: "UAL", name: "United Airlines", sector: "Industrials", kind: "stock" },
  { symbol: "AAL", name: "American Airlines", sector: "Industrials", kind: "stock" },
  { symbol: "CCL", name: "Carnival", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "MAR", name: "Marriott International", sector: "Consumer Discretionary", kind: "stock" },
  { symbol: "PM", name: "Philip Morris International", sector: "Consumer Staples", kind: "stock" },
  { symbol: "MO", name: "Altria Group", sector: "Consumer Staples", kind: "stock" },
  { symbol: "O", name: "Realty Income", sector: "Real Estate", kind: "stock" },
  { symbol: "AMT", name: "American Tower", sector: "Real Estate", kind: "stock" },
  { symbol: "NEE", name: "NextEra Energy", sector: "Utilities", kind: "stock" },
  { symbol: "SO", name: "Southern Company", sector: "Utilities", kind: "stock" },

  // Broad-market & sector ETFs
  { symbol: "SPY", name: "SPDR S&P 500 ETF", sector: "ETF - Broad Market", kind: "etf" },
  { symbol: "QQQ", name: "Invesco QQQ", sector: "ETF - Broad Market", kind: "etf" },
  { symbol: "IWM", name: "iShares Russell 2000", sector: "ETF - Broad Market", kind: "etf" },
  { symbol: "DIA", name: "SPDR Dow Jones ETF", sector: "ETF - Broad Market", kind: "etf" },
  { symbol: "XLK", name: "Technology Select SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLF", name: "Financial Select SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLE", name: "Energy Select SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLV", name: "Health Care Select SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLI", name: "Industrial Select SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLP", name: "Consumer Staples SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLY", name: "Consumer Discretionary SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XLU", name: "Utilities Select SPDR", sector: "ETF - Sector", kind: "etf" },
  { symbol: "SMH", name: "VanEck Semiconductor ETF", sector: "ETF - Sector", kind: "etf" },
  { symbol: "XBI", name: "SPDR S&P Biotech ETF", sector: "ETF - Sector", kind: "etf" },
  { symbol: "KRE", name: "SPDR Regional Banking ETF", sector: "ETF - Sector", kind: "etf" },
  { symbol: "GDX", name: "VanEck Gold Miners ETF", sector: "ETF - Commodity", kind: "etf" },
  { symbol: "GLD", name: "SPDR Gold Shares", sector: "ETF - Commodity", kind: "etf" },
  { symbol: "SLV", name: "iShares Silver Trust", sector: "ETF - Commodity", kind: "etf" },
  { symbol: "USO", name: "United States Oil Fund", sector: "ETF - Commodity", kind: "etf" },
  { symbol: "TLT", name: "iShares 20+ Year Treasury", sector: "ETF - Rates", kind: "etf" },
  { symbol: "HYG", name: "iShares High Yield Corporate", sector: "ETF - Rates", kind: "etf" },
  { symbol: "EEM", name: "iShares MSCI Emerging Markets", sector: "ETF - International", kind: "etf" },
  { symbol: "EFA", name: "iShares MSCI EAFE", sector: "ETF - International", kind: "etf" },
  { symbol: "FXI", name: "iShares China Large-Cap", sector: "ETF - International", kind: "etf" },
  { symbol: "ARKK", name: "ARK Innovation ETF", sector: "ETF - Thematic", kind: "etf" },
  { symbol: "BITO", name: "ProShares Bitcoin ETF", sector: "ETF - Crypto", kind: "etf" },
  { symbol: "IBIT", name: "iShares Bitcoin Trust", sector: "ETF - Crypto", kind: "etf" },
];

export const UNIVERSE_SYMBOLS = UNIVERSE.map((meta) => meta.symbol);

const PEER_GROUPS: Array<[string, Set<string>]> = [
  ["Semiconductors · compute", new Set(["AMD", "NVDA", "INTC", "ARM"])],
  ["Semiconductors · connectivity", new Set(["AVGO", "QCOM", "MRVL"])],
  ["Semiconductors · equipment", new Set(["ASML", "LRCX", "AMAT"])],
  ["Semiconductors · memory", new Set(["MU"])],
  ["Semiconductors · analog", new Set(["TXN"])],
  ["Semiconductors · foundry", new Set(["TSM"])],
  ["Banks", new Set(["JPM", "BAC", "WFC", "C", "GS", "MS"])],
  ["Payments", new Set(["V", "MA", "AXP", "PYPL"])],
  ["Capital markets", new Set(["SCHW", "BLK", "COIN", "HOOD"])],
  ["Integrated oil", new Set(["XOM", "CVX", "OXY"])],
  ["Biopharma", new Set(["LLY", "PFE", "MRK", "ABBV", "BMY", "AMGN", "GILD", "MRNA"])],
  ["Airlines", new Set(["DAL", "UAL", "AAL"])],
  ["Autos", new Set(["TSLA", "F", "GM", "RIVN"])],
  ["Travel platforms", new Set(["ABNB", "BKNG", "MAR"])],
  ["Telecom", new Set(["T", "VZ", "CMCSA"])],
  ["Enterprise software", new Set(["MSFT", "CRM", "ORCL", "ADBE", "NOW", "INTU", "PLTR", "SNOW"])],
  ["Cybersecurity", new Set(["PANW", "CRWD"])],
  ["Consumer staples", new Set(["WMT", "COST", "PG", "KO", "PEP", "TGT", "PM", "MO"])],
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
