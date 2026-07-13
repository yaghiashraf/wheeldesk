export type OptionType = "call" | "put";

export type Strategy = "csp" | "cc";

export type DataSource = "alpaca" | "cboe";

export type FundamentalSource = "nasdaq" | "fmp" | "unavailable" | "not-applicable";
export type RealizedVolSource = "alpaca" | "fmp" | "yahoo";

export type ContractQuote = {
  occSymbol: string;
  underlying: string;
  type: OptionType;
  strike: number;
  /** YYYY-MM-DD */
  expiration: string;
  bid: number | null;
  ask: number | null;
  last: number | null;
  /** Decimal, e.g. 0.35 = 35% */
  iv: number | null;
  delta: number | null;
  gamma: number | null;
  theta: number | null;
  vega: number | null;
  openInterest: number | null;
  volume: number | null;
};

export type Chain = {
  symbol: string;
  spot: number;
  /** ISO timestamp of the quote payload */
  asOf: string;
  source: DataSource;
  /** Underlying 30-day implied volatility when the vendor supplies it (decimal) */
  iv30: number | null;
  contracts: ContractQuote[];
};

export type DailyBar = {
  /** YYYY-MM-DD */
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type VixRegime = "calm" | "normal" | "elevated" | "stressed";

export type RegimeInfo = {
  vix: number;
  regime: VixRegime;
  asOf: string;
};

/** One screener result row: a contract plus every derived wheel metric. */
export type ScreenerRow = {
  occSymbol: string;
  symbol: string;
  name: string;
  sector: string;
  /** Business-model comparison cohort; may fall back to sector when thin. */
  peerGroup: string;
  kind: "stock" | "etf";
  strategy: Strategy;
  spot: number;
  strike: number;
  expiration: string;
  dte: number;
  bid: number | null;
  ask: number | null;
  /** Mid price per share */
  mid: number;
  /** Premium per contract (mid x 100) */
  premium: number;
  delta: number | null;
  iv: number | null;
  /** Implied vs 30-day realized volatility; null when history is unavailable */
  ivRv: number | null;
  /** Annualized standard deviation of the latest 30 daily log returns. */
  rv30: number | null;
  rv30Source: RealizedVolSource | null;
  /** Vendor-supplied 30-day at-the-money underlying IV, decimal */
  iv30: number | null;
  /** Contract IV divided by underlying 30-day IV; a simple skew/richness proxy */
  ivToIv30: number | null;
  /** (ask - bid) / mid, decimal */
  spreadPct: number | null;
  /** Premium / collateral (CSP) or premium / spot (CC), decimal, for the period */
  roc: number;
  /** ROC annualized by 365/dte, decimal */
  rocAnnualized: number;
  /** Model probability the option finishes in the money, decimal */
  pItm: number | null;
  breakeven: number;
  /** Distance out of the money, decimal (positive = OTM) */
  otmPct: number;
  openInterest: number | null;
  volume: number | null;
  /** Earnings date inside the DTE window, when known */
  earningsDate: string | null;
  /** Ex-dividend date inside the DTE window, when known */
  exDivDate: string | null;
  /** Whether the event-calendar provider was configured for this scan. */
  eventDataAvailable: boolean;
  /** Quote timestamp for the underlying option chain */
  chainAsOf: string;
  fundamentals: FundamentalSnapshot;
};

export type ScreenerFilters = {
  strategy: Strategy;
  minDte: number;
  maxDte: number;
  minDelta: number;
  maxDelta: number;
  /** Minimum ROC for the period, decimal */
  minRoc: number;
  minOpenInterest: number;
  /** Max (ask-bid)/mid, decimal; null disables the gate */
  maxSpreadPct: number | null;
  otmOnly: boolean;
  avoidEarnings: boolean;
  maxPerSymbol: number;
  /** Client-side peer-valuation gate. 100 disables it. */
  maxValuationPercentile: number;
  /** Client-side peer-quality gate. 0 disables it. */
  minQualityScore: number;
  /** Minimum premium-adjusted downside buffer / expected move. */
  minExpectedMoveCoverage: number;
  /** Exclude ETFs, whose company valuation is not comparable. */
  stocksOnly: boolean;
};

export type ScreenerBatchResponse = {
  rows: ScreenerRow[];
  /** Fundamental observations are independent of option qualification. */
  fundamentalUniverse: FundamentalPeerSnapshot[];
  /** Symbols scanned in this batch */
  scanned: string[];
  /** Symbols that failed to load in this batch */
  failed: string[];
  nextCursor: number | null;
  universeSize: number;
  regime: RegimeInfo | null;
  asOf: string;
};

export type SymbolMeta = {
  symbol: string;
  name: string;
  sector: string;
  kind: "stock" | "etf";
};

export type FundamentalPeerSnapshot = {
  symbol: string;
  name: string;
  sector: string;
  peerGroup: string;
  kind: "stock" | "etf";
  fundamentals: FundamentalSnapshot;
};

/** Reported-fundamental snapshot used to build peer-relative assignment scores. */
export type FundamentalSnapshot = {
  symbol: string;
  source: FundamentalSource;
  /** Latest reported fiscal-period end, YYYY-MM-DD when available. */
  asOf: string | null;
  marketCap: number | null;
  enterpriseValue: number | null;
  peTtm: number | null;
  evEbitdaTtm: number | null;
  priceToFcfTtm: number | null;
  fcfYieldTtm: number | null;
  priceToBookTtm: number | null;
  roicTtm: number | null;
  roeTtm: number | null;
  grossMarginTtm: number | null;
  operatingMarginTtm: number | null;
  netMarginTtm: number | null;
  fcfMarginTtm: number | null;
  netDebtToEbitdaTtm: number | null;
  /** Median margins across up to four reported fiscal years. */
  normalizedNetMargin: number | null;
  normalizedFcfMargin: number | null;
  /** Current market cap divided by revenue TTM at normalized margins. */
  normalizedPe: number | null;
  normalizedPriceToFcf: number | null;
  /** TTM net margin / normalized net margin; >1 indicates above-cycle earnings. */
  earningsCycleRatio: number | null;
  annualHistoryYears: number;
  /** Fraction of core fields available, 0–1. */
  coverage: number;
  /** Human-readable reason when fundamentals cannot be compared. */
  note: string | null;
};
