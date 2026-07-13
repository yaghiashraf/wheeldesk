const YAHOO_CHART_ROOT = "https://query1.finance.yahoo.com/v8/finance/chart";
const HISTORY_REVALIDATE_SECONDS = 3_600;

type YahooChartPayload = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: {
        adjclose?: Array<{ adjclose?: Array<number | null> }>;
      };
    }>;
    error?: unknown;
  };
};

/**
 * Adjusted daily closes from Yahoo's public chart response. This is a tertiary
 * fallback when credentialed Alpaca and FMP history are unavailable; failures
 * remain explicit and never produce an invented volatility observation.
 */
export async function getYahooDailyCloses(
  symbol: string,
  limit = 60,
): Promise<number[]> {
  const yahooSymbol = symbol.toUpperCase().replace(".", "-");
  try {
    const params = new URLSearchParams({
      range: "3mo",
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
    if (!response.ok) return [];
    const payload = (await response.json()) as YahooChartPayload;
    if (payload.chart?.error) return [];
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
