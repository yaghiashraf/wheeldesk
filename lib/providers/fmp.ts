const FMP_ROOT = "https://financialmodelingprep.com/stable";
const CALENDAR_REVALIDATE_SECONDS = 43_200;
const PRICE_REVALIDATE_SECONDS = 3_600;

export function hasFmpKey(): boolean {
  return Boolean(process.env.FMP_API_KEY);
}

async function fmpFetch<T>(
  path: string,
  params: Record<string, string>,
  revalidate = CALENDAR_REVALIDATE_SECONDS,
): Promise<T | null> {
  const key = process.env.FMP_API_KEY;
  if (!key) return null;
  const search = new URLSearchParams({ ...params, apikey: key });
  try {
    const response = await fetch(`${FMP_ROOT}${path}?${search.toString()}`, {
      next: { revalidate },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

type FmpLightPrice = {
  symbol?: string;
  date?: string;
  price?: number;
};

/**
 * Split-adjusted daily closing prices for RV calculations. FMP's light chart
 * keeps the scan payload small; rows arrive newest-first and are normalized to
 * chronological order before the latest observations are selected.
 */
export async function getFmpDailyCloses(
  symbol: string,
  limit = 60,
): Promise<number[]> {
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - Math.max(100, limit * 2) * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const rows = await fmpFetch<FmpLightPrice[]>(
    "/historical-price-eod/light",
    { symbol, from, to },
    PRICE_REVALIDATE_SECONDS,
  );
  return (rows ?? [])
    .filter(
      (row): row is FmpLightPrice & { date: string; price: number } =>
        typeof row.date === "string" &&
        typeof row.price === "number" &&
        Number.isFinite(row.price) &&
        row.price > 0,
    )
    .toSorted((a, b) => a.date.localeCompare(b.date))
    .slice(-limit)
    .map((row) => row.price);
}

function calendarWindow(days: number) {
  const from = new Date().toISOString().slice(0, 10);
  const to = new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
  return { from, to };
}

/**
 * Upcoming earnings dates for the next `days` days, keyed by symbol (earliest
 * date wins). Empty map when FMP_API_KEY is unset or the request fails — the
 * app then shows the earnings column as unavailable rather than guessing.
 */
export async function getEarningsCalendar(days = 90): Promise<Record<string, string>> {
  const rows = await fmpFetch<Array<{ symbol: string; date: string }>>(
    "/earnings-calendar",
    calendarWindow(days),
  );
  const bySymbol: Record<string, string> = {};
  for (const row of rows ?? []) {
    if (!row.symbol || !row.date) continue;
    if (!bySymbol[row.symbol] || row.date < bySymbol[row.symbol]) {
      bySymbol[row.symbol] = row.date;
    }
  }
  return bySymbol;
}

/** Upcoming ex-dividend dates for the next `days` days, keyed by symbol. */
export async function getDividendCalendar(days = 90): Promise<Record<string, string>> {
  const rows = await fmpFetch<Array<{ symbol: string; date: string }>>(
    "/dividends-calendar",
    calendarWindow(days),
  );
  const bySymbol: Record<string, string> = {};
  for (const row of rows ?? []) {
    if (!row.symbol || !row.date) continue;
    if (!bySymbol[row.symbol] || row.date < bySymbol[row.symbol]) {
      bySymbol[row.symbol] = row.date;
    }
  }
  return bySymbol;
}
