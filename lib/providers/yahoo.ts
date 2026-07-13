const YAHOO_CHART_ROOT = "https://query1.finance.yahoo.com/v8/finance/chart";
const HISTORY_REVALIDATE_SECONDS = 3_600;

type YahooChartPayload = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      meta?: {
        regularMarketPrice?: number;
        regularMarketTime?: number;
      };
      indicators?: {
        adjclose?: Array<{ adjclose?: Array<number | null> }>;
        quote?: Array<{ close?: Array<number | null> }>;
      };
    }>;
    error?: unknown;
  };
};

async function getYahooChart(symbol: string, range: string): Promise<YahooChartPayload | null> {
  const yahooSymbol = symbol.toUpperCase().replace(".", "-");
  try {
    const params = new URLSearchParams({
      range,
      interval: "1d",
      events: "div,splits",
      includeAdjustedClose: "true",
    });
    const response = await fetch(
      `${YAHOO_CHART_ROOT}/${encodeURIComponent(yahooSymbol)}?${params.toString()}`,
      {
        headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
        next: { revalidate: HISTORY_REVALIDATE_SECONDS },
        signal: AbortSignal.timeout(12_000),
      },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as YahooChartPayload;
    return payload.chart?.error ? null : payload;
  } catch {
    return null;
  }
}

/**
 * Adjusted daily closes from Yahoo's public chart response. This is a tertiary
 * fallback when credentialed Alpaca and FMP history are unavailable; failures
 * remain explicit and never produce an invented volatility observation.
 */
export async function getYahooDailyCloses(
  symbol: string,
  limit = 60,
): Promise<number[]> {
  try {
    const payload = await getYahooChart(symbol, "3mo");
    if (!payload) return [];
    const result = payload.chart?.result?.[0];
    const timestamps = result?.timestamp ?? [];
    const adjusted = result?.indicators?.adjclose?.[0]?.adjclose ?? [];
    return timestamps
      .map((timestamp, index) => ({ timestamp, close: adjusted[index] }))
      .filter(
        (point): point is { timestamp: number; close: number } =>
          typeof point.close === "number" &&
          Number.isFinite(point.close) &&
          point.close > 0,
      )
      .toSorted((a, b) => a.timestamp - b.timestamp)
      .slice(-limit)
      .map((point) => point.close);
  } catch {
    return [];
  }
}

/** Latest index/equity price from Yahoo chart metadata, with daily close fallback. */
export async function getYahooLatestPrice(
  symbol: string,
): Promise<{ price: number; asOf: string } | null> {
  const payload = await getYahooChart(symbol, "5d");
  const result = payload?.chart?.result?.[0];
  if (!result) return null;

  const marketPrice = result.meta?.regularMarketPrice;
  if (typeof marketPrice === "number" && Number.isFinite(marketPrice) && marketPrice > 0) {
    const marketTime = result.meta?.regularMarketTime;
    return {
      price: marketPrice,
      asOf:
        typeof marketTime === "number"
          ? new Date(marketTime * 1000).toISOString()
          : new Date().toISOString(),
    };
  }

  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  for (let index = closes.length - 1; index >= 0; index--) {
    const close = closes[index];
    if (typeof close !== "number" || !Number.isFinite(close) || close <= 0) continue;
    return {
      price: close,
      asOf:
        typeof timestamps[index] === "number"
          ? new Date(timestamps[index] * 1000).toISOString()
          : new Date().toISOString(),
    };
  }
  return null;
}
