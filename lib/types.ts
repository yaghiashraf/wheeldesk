export type OptionType = "call" | "put";

export type Strategy = "csp" | "cc";

export type DataSource = "alpaca" | "cboe";

export type FundamentalSource = "nasdaq" | "fmp" | "unavailable" | "not-applicable";
export type RealizedVolSource = "alpaca" | "fmp" | "yahoo";

/**
 * `in-window` a confirmed report lands on or before expiration · `clear` the
 * calendar covers this name and puts its next report after expiration ·
 * `unknown` the calendar does not cover the name, so assignment risk around an
 * unscheduled print is unquantified · `not-applicable` funds do not report.
 */
export type EarningsStatus = "in-window" | "clear" | "unknown" | "not-applicable";

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
  watchlistTier: WatchlistTier;
  tierProxy: string | null;
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
  /** Provider used for the trailing daily-price context below. */
  priceHistorySource: RealizedVolSource | null;
  /** Usable adjusted daily closes returned by the price-history provider. */
  priceHistoryObservations: number;
  /** Highest adjusted close in the latest 252 sessions; requires a usable 1y history. */
  high52w: number | null;
  /** Positive decimal distance below the trailing high, e.g. 0.18 = 18% below. */
  drawdown52w: number | null;
  /** Spot return versus the adjusted close roughly 21 sessions earlier. */
  return1m: number | null;
  /** Spot return versus the adjusted close roughly 63 sessions earlier. */
  return3m: number | null;
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
  /**
   * What we actually know about earnings before this expiration. The calendar
   * can only ever prove presence: a symbol missing from a 90-day forward feed
   * has no confirmable date, and every operating company reports quarterly, so
   * absence means the provider does not cover the name — never "no earnings".
   * `clear` is therefore reserved for names the calendar does cover.
   */
  earningsStatus: EarningsStatus;
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
  /** Minimum premium / committed capital for the contract, decimal. */
  minRoc: number;
  minOpenInterest: number;
  /** Max (ask-bid)/mid, decimal; null disables the gate */
  maxSpreadPct: number | null;
  otmOnly: boolean;
  avoidEarnings: boolean;
  maxPerSymbol: number;
  /** Peer-valuation triage threshold. 100 disables the warning. */
  maxValuationPercentile: number;
  /** Peer-quality triage threshold. 0 disables the warning. */
  minQualityScore: number;
  /** Premium-adjusted downside buffer / expected-move triage threshold. */
  minExpectedMoveCoverage: number;
  /** Exclude ETFs, whose company valuation is not comparable. */
  stocksOnly: boolean;
  /** Which symbol list the cursor scan walks. */
  scope: ScanScope;
};

/**
 * `1a` the doctrine hunt list · `ibkr` the names on the IBKR watchlist, every
 * tier, non-1A put rows gated with the doctrine reason · `all` every tier.
 */
export type ScanScope = "1a" | "ibkr" | "all";

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

/**
 * VORTEX_WATCHLIST.md tier. Only `1A` carries fresh cash-secured put
 * eligibility; every other tier is scanned for covered calls and appears in a
 * put scan only on request, gated with the doctrine reason.
 */
export type WatchlistTier =
  | "1A"
  | "1A-pending"
  | "1B"
  | "own-only"
  | "cut"
  | "bad-bank"
  | "rejected"
  | "untiered";

export type SymbolMeta = {
  symbol: string;
  name: string;
  sector: string;
  kind: "stock" | "etf";
  tier: WatchlistTier;
  /** Tier 1B names route puts to this ETF; null when doctrine names none. */
  proxy?: string;
};

export type FundamentalPeerSnapshot = {
  symbol: string;
  name: string;
  sector: string;
  peerGroup: string;
  kind: "stock" | "etf";
  watchlistTier: WatchlistTier;
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
