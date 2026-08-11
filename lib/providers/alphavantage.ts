const AV_ROOT = "https://www.alphavantage.co/query";
const CALENDAR_REVALIDATE_SECONDS = 43_200;

export function hasAlphaVantageKey(): boolean {
  return Boolean(process.env.ALPHAVANTAGE_API_KEY);
}

/**
 * Minimal CSV reader for Alpha Vantage's calendar feed, which returns CSV
 * rather than JSON. Fields are plain symbols and ISO dates — no embedded
 * commas or quoting — so a full parser would be dead weight here.
 */
function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((cell) => cell.trim());
  return lines.slice(1).flatMap((line) => {
    const cells = line.split(",");
    if (cells.length < headers.length) return [];
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (cells[index] ?? "").trim();
    });
    return [row];
  });
}

/**
 * Upcoming earnings dates keyed by symbol, from Alpha Vantage's forward
 * calendar. One request covers the entire market, so this is a single cached
 * call per scan rather than per-symbol lookups — which is what keeps it inside
 * a free key's daily budget.
 *
 * Exists because FMP's calendar carries under half of the watchlist; the two
 * feeds disagree about which names they cover, so the union is materially
 * wider than either alone. Empty map when the key is unset or the call fails,
 * which leaves affected names reported as unknown rather than clear.
 */
export async function getAlphaVantageEarningsCalendar(
  horizon: "3month" | "6month" | "12month" = "3month",
): Promise<Record<string, string>> {
  const key = process.env.ALPHAVANTAGE_API_KEY;
  if (!key) return {};
  const search = new URLSearchParams({
    function: "EARNINGS_CALENDAR",
    horizon,
    apikey: key,
  });
  try {
    const response = await fetch(`${AV_ROOT}?${search.toString()}`, {
      next: { revalidate: CALENDAR_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return {};
    const text = await response.text();
    // A rate-limited or invalid key answers 200 with a JSON note, not CSV.
    if (!text.startsWith("symbol,")) return {};
    const bySymbol: Record<string, string> = {};
    for (const row of parseCsv(text)) {
      const symbol = row.symbol?.toUpperCase();
      const date = row.reportDate;
      if (!symbol || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (!bySymbol[symbol] || date < bySymbol[symbol]) bySymbol[symbol] = date;
    }
    return bySymbol;
  } catch {
    return {};
  }
}
