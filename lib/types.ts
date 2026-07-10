export type OptionType = "call" | "put";

export type Strategy = "csp" | "cc";

export type DataSource = "alpaca" | "cboe";

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
  score: number;
  scoreParts: ScoreParts;
};

export type ScoreParts = {
  yield: number;
  annualized: number;
  deltaFit: number;
  liquidity: number;
  ivRichness: number;
  buffer: number;
  earningsPenalty: number;
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
};

export type ScreenerBatchResponse = {
  rows: ScreenerRow[];
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
