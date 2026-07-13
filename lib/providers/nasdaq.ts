import type { FundamentalSnapshot, SymbolMeta } from "@/lib/types";

const NASDAQ_ROOT = "https://api.nasdaq.com/api";
const DIRECTORY_TTL_SECONDS = 300;
const FINANCIALS_TTL_SECONDS = 43_200;

const NASDAQ_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://www.nasdaq.com",
  Referer: "https://www.nasdaq.com/",
};

type NasdaqSummaryPayload = {
  data?: {
    summaryData?: {
      MarketCap?: {
        value?: string;
      };
    };
  };
  status?: { rCode?: number };
};

type NasdaqTable = {
  headers?: Record<string, string>;
  rows?: Array<Record<string, string>>;
  asOf?: string | null;
};

type NasdaqFinancialsPayload = {
  data?: {
    symbol?: string;
    incomeStatementTable?: NasdaqTable;
    balanceSheetTable?: NasdaqTable;
    cashFlowTable?: NasdaqTable;
    financialRatiosTable?: NasdaqTable;
  };
  status?: { rCode?: number };
  message?: string | null;
};

function unavailable(symbol: string, note: string): FundamentalSnapshot {
  return {
    symbol,
    source: "unavailable",
    asOf: null,
    marketCap: null,
    enterpriseValue: null,
    peTtm: null,
    evEbitdaTtm: null,
    priceToFcfTtm: null,
    fcfYieldTtm: null,
    priceToBookTtm: null,
    roicTtm: null,
    roeTtm: null,
    grossMarginTtm: null,
    operatingMarginTtm: null,
    netMarginTtm: null,
    fcfMarginTtm: null,
    netDebtToEbitdaTtm: null,
    coverage: 0,
    note,
  };
}

function notApplicable(symbol: string): FundamentalSnapshot {
  return {
    ...unavailable(symbol, "Company valuation is not comparable for ETFs."),
    source: "not-applicable",
  };
}

async function nasdaqFetch<T>(path: string, revalidate: number): Promise<T> {
  const response = await fetch(`${NASDAQ_ROOT}${path}`, {
    headers: NASDAQ_HEADERS,
    next: { revalidate },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    throw new Error(`Nasdaq request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

function parseNumber(value: string | undefined): number | null {
  if (!value || value === "--") return null;
  const negative = value.trim().startsWith("(") || value.trim().startsWith("-$");
  const numeric = Number(value.replace(/[$,%(),]/g, "").replace(/^-/g, ""));
  if (!Number.isFinite(numeric)) return null;
  return negative ? -numeric : numeric;
}

function parseStatementNumber(value: string | undefined): number | null {
  const parsed = parseNumber(value);
  return parsed === null ? null : parsed * 1_000;
}

function safeRatio(numerator: number | null, denominator: number | null): number | null {
  if (
    numerator === null ||
    denominator === null ||
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator) ||
    denominator <= 0
  ) {
    return null;
  }
  const value = numerator / denominator;
  return Number.isFinite(value) ? value : null;
}

function boundedMultiple(value: number | null, max = 250): number | null {
  return value !== null && value > 0 && value <= max ? value : null;
}

function row(table: NasdaqTable | undefined, labels: string[]): Record<string, string> | null {
  const candidates = new Set(labels.map((label) => label.toLowerCase()));
  return (
    table?.rows?.find((item) => candidates.has((item.value1 ?? "").toLowerCase())) ?? null
  );
}

function latest(table: NasdaqTable | undefined, labels: string[]): number | null {
  return parseStatementNumber(row(table, labels)?.value2);
}

function trailingFour(table: NasdaqTable | undefined, labels: string[]): number | null {
  const found = row(table, labels);
  if (!found) return null;
  const values = [found.value2, found.value3, found.value4, found.value5].map(
    parseStatementNumber,
  );
  if (values.some((value) => value === null)) return null;
  return (values as number[]).reduce((sum, value) => sum + value, 0);
}

function isoDate(value: string | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(`${value} 12:00:00 UTC`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function deriveSnapshot(
  symbol: string,
  marketCap: number,
  payload: NasdaqFinancialsPayload,
): FundamentalSnapshot {
  const income = payload.data?.incomeStatementTable;
  const balance = payload.data?.balanceSheetTable;
  const cashFlow = payload.data?.cashFlowTable;

  const revenue = trailingFour(income, ["Total Revenue"]);
  const grossProfit = trailingFour(income, ["Gross Profit"]);
  const operatingIncome = trailingFour(income, ["Operating Income"]);
  const ebt = trailingFour(income, ["Earnings Before Tax"]);
  const incomeTax = trailingFour(income, ["Income Tax"]);
  const netIncome = trailingFour(income, [
    "Net Income Applicable to Common Shareholders",
    "Net Income",
  ]);
  const operatingCashFlow = trailingFour(cashFlow, ["Net Cash Flow-Operating"]);
  const capex = trailingFour(cashFlow, ["Capital Expenditures"]);
  const depreciation = trailingFour(cashFlow, ["Depreciation"]);

  const cash = latest(balance, ["Cash and Cash Equivalents"]);
  const shortInvestments = latest(balance, ["Short-Term Investments"]);
  const currentDebt = latest(balance, [
    "Short-Term Debt / Current Portion of Long-Term Debt",
  ]);
  const longDebt = latest(balance, ["Long-Term Debt"]);
  const equity = latest(balance, ["Total Equity"]);

  const totalDebt =
    currentDebt === null && longDebt === null
      ? null
      : (currentDebt ?? 0) + (longDebt ?? 0);
  const liquidAssets =
    cash === null && shortInvestments === null
      ? null
      : (cash ?? 0) + (shortInvestments ?? 0);
  const netDebt =
    totalDebt === null || liquidAssets === null ? null : totalDebt - liquidAssets;
  const enterpriseValue = netDebt === null ? null : marketCap + netDebt;
  const ebitda =
    operatingIncome !== null && depreciation !== null
      ? operatingIncome + Math.abs(depreciation)
      : null;
  const freeCashFlow =
    operatingCashFlow !== null && capex !== null
      ? operatingCashFlow + capex
      : null;
  const taxRateRaw = safeRatio(incomeTax, ebt);
  const taxRate = taxRateRaw === null ? 0.21 : Math.min(0.35, Math.max(0, taxRateRaw));
  const nopat = operatingIncome === null ? null : operatingIncome * (1 - taxRate);
  const investedCapital =
    totalDebt === null || equity === null || liquidAssets === null
      ? null
      : totalDebt + equity - liquidAssets;

  const peTtm = boundedMultiple(safeRatio(marketCap, netIncome));
  const evEbitdaTtm = boundedMultiple(safeRatio(enterpriseValue, ebitda), 100);
  const priceToFcfTtm = boundedMultiple(safeRatio(marketCap, freeCashFlow));
  const priceToBookTtm = boundedMultiple(safeRatio(marketCap, equity), 100);
  const roicTtm = safeRatio(nopat, investedCapital);
  const roeTtm = safeRatio(netIncome, equity);
  const grossMarginTtm = safeRatio(grossProfit, revenue);
  const operatingMarginTtm = safeRatio(operatingIncome, revenue);
  const netMarginTtm = safeRatio(netIncome, revenue);
  const fcfMarginTtm = safeRatio(freeCashFlow, revenue);
  const netDebtToEbitdaTtm =
    netDebt !== null && ebitda !== null && ebitda > 0 ? netDebt / ebitda : null;

  const core = [
    peTtm,
    evEbitdaTtm,
    priceToFcfTtm,
    roicTtm,
    operatingMarginTtm,
    fcfMarginTtm,
    netDebtToEbitdaTtm,
  ];
  const coverage = core.filter((value) => value !== null).length / core.length;

  return {
    symbol,
    source: "nasdaq",
    asOf: isoDate(income?.headers?.value2),
    marketCap,
    enterpriseValue,
    peTtm,
    evEbitdaTtm,
    priceToFcfTtm,
    fcfYieldTtm: safeRatio(freeCashFlow, marketCap),
    priceToBookTtm,
    roicTtm,
    roeTtm,
    grossMarginTtm,
    operatingMarginTtm,
    netMarginTtm,
    fcfMarginTtm,
    netDebtToEbitdaTtm:
      netDebtToEbitdaTtm !== null && Number.isFinite(netDebtToEbitdaTtm)
        ? netDebtToEbitdaTtm
        : null,
    coverage,
    note:
      coverage >= 0.7
        ? "TTM derived from the latest four reported quarters."
        : "Partial reported fundamentals; composite confidence is reduced.",
  };
}

async function fetchOne(
  meta: SymbolMeta,
): Promise<FundamentalSnapshot> {
  if (meta.kind === "etf") return notApplicable(meta.symbol);

  try {
    const encodedSymbol = encodeURIComponent(meta.symbol.replace(".", "-"));
    const [summary, payload] = await Promise.all([
      nasdaqFetch<NasdaqSummaryPayload>(
        `/quote/${encodedSymbol}/summary?assetclass=stocks`,
        DIRECTORY_TTL_SECONDS,
      ),
      nasdaqFetch<NasdaqFinancialsPayload>(
        `/company/${encodedSymbol}/financials?frequency=2`,
        FINANCIALS_TTL_SECONDS,
      ),
    ]);
    const marketCap = parseNumber(summary.data?.summaryData?.MarketCap?.value);
    if (marketCap === null || marketCap <= 0) {
      return unavailable(meta.symbol, "Current market capitalization unavailable.");
    }
    if (!payload.data || (payload.status?.rCode && payload.status.rCode !== 200)) {
      return unavailable(meta.symbol, payload.message || "Reported fundamentals unavailable.");
    }
    return deriveSnapshot(meta.symbol, marketCap, payload);
  } catch {
    return unavailable(meta.symbol, "Reported fundamentals request failed.");
  }
}

/**
 * Keyless, reported-fundamental snapshots for a scan batch. Market cap is
 * current; TTM values are derived from the latest four reported quarters.
 * Failures are explicit snapshots so the ranking layer never invents a neutral
 * valuation score for missing data.
 */
export async function getNasdaqFundamentals(
  metas: SymbolMeta[],
): Promise<Record<string, FundamentalSnapshot>> {
  const entries = await Promise.all(
    metas.map(async (meta) => [meta.symbol, await fetchOne(meta)] as const),
  );
  return Object.fromEntries(entries);
}
