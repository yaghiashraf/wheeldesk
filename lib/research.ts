import type { FundamentalSnapshot, ScreenerRow } from "@/lib/types";

export type FactorMetric = {
  key: keyof FundamentalSnapshot;
  label: string;
  value: number | null;
  percentile: number | null;
  format: "multiple" | "percent";
  favorable: "low" | "high";
};

export type ResearchScores = {
  underwriteScore: number | null;
  assignmentScore: number | null;
  valuationScore: number | null;
  valuationPercentile: number | null;
  valuationLabel: string;
  qualityScore: number | null;
  volEdgeScore: number;
  volEdgeBasis: "IV/RV30" | "Contract IV/IV30" | "IV only";
  executionScore: number;
  carryScore: number;
  confidence: number;
  peerCount: number;
  peerLabel: string;
  valuationMetrics: FactorMetric[];
  qualityMetrics: FactorMetric[];
  missingEvidence: string[];
};

export type ResearchRow = ScreenerRow & { research: ResearchScores };

type MetricSpec = Pick<FactorMetric, "key" | "label" | "format" | "favorable">;

const STANDARD_VALUATION: MetricSpec[] = [
  { key: "peTtm", label: "P/E (TTM)", format: "multiple", favorable: "low" },
  {
    key: "evEbitdaTtm",
    label: "EV / EBITDA (TTM)",
    format: "multiple",
    favorable: "low",
  },
  {
    key: "priceToFcfTtm",
    label: "P / FCF (TTM)",
    format: "multiple",
    favorable: "low",
  },
];

const FINANCIAL_VALUATION: MetricSpec[] = [
  { key: "peTtm", label: "P/E (TTM)", format: "multiple", favorable: "low" },
  {
    key: "priceToBookTtm",
    label: "P / Book (latest)",
    format: "multiple",
    favorable: "low",
  },
];

const STANDARD_QUALITY: MetricSpec[] = [
  { key: "roicTtm", label: "ROIC (TTM)", format: "percent", favorable: "high" },
  {
    key: "operatingMarginTtm",
    label: "Operating margin",
    format: "percent",
    favorable: "high",
  },
  {
    key: "fcfMarginTtm",
    label: "FCF margin",
    format: "percent",
    favorable: "high",
  },
  {
    key: "netDebtToEbitdaTtm",
    label: "Net debt / EBITDA",
    format: "multiple",
    favorable: "low",
  },
];

const FINANCIAL_QUALITY: MetricSpec[] = [
  { key: "roeTtm", label: "ROE (TTM)", format: "percent", favorable: "high" },
  {
    key: "netMarginTtm",
    label: "Net margin",
    format: "percent",
    favorable: "high",
  },
];

function clamp(value: number, low = 0, high = 100): number {
  return Math.min(high, Math.max(low, value));
}

function round(value: number): number {
  return Math.round(value);
}

function numeric(snapshot: FundamentalSnapshot, key: keyof FundamentalSnapshot): number | null {
  const value = snapshot[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function percentile(value: number, peers: number[]): number | null {
  const valid = peers.filter(Number.isFinite).toSorted((a, b) => a - b);
  if (valid.length < 3) return null;
  if (valid.length === 1) return 50;
  const below = valid.filter((item) => item < value).length;
  const equal = valid.filter((item) => item === value).length;
  return ((below + Math.max(0, equal - 1) / 2) / (valid.length - 1)) * 100;
}

function metricRows(
  snapshot: FundamentalSnapshot,
  peers: FundamentalSnapshot[],
  specs: MetricSpec[],
): FactorMetric[] {
  return specs.map((spec) => {
    const value = numeric(snapshot, spec.key);
    const peerValues = peers.flatMap((peer) => {
      const peerValue = numeric(peer, spec.key);
      return peerValue === null ? [] : [peerValue];
    });
    return {
      ...spec,
      value,
      percentile: value === null ? null : percentile(value, peerValues),
    };
  });
}

function average(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value !== null);
  return valid.length > 0 ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function valuationLabel(percentileValue: number | null, snapshot: FundamentalSnapshot): string {
  if (snapshot.source === "not-applicable") return "ETF · N/A";
  if (snapshot.source === "unavailable") return "Data gap";
  if (percentileValue === null) return "Peer set thin";
  if (percentileValue <= 20) return "Deep discount";
  if (percentileValue <= 40) return "Discount";
  if (percentileValue <= 60) return "Fair";
  if (percentileValue <= 80) return "Premium";
  return "Rich";
}

function optionFactors(row: ScreenerRow) {
  const volBasis = row.ivRv ?? row.ivToIv30;
  const volEdgeScore =
    volBasis !== null
      ? clamp(((volBasis - 0.7) / 0.9) * 100)
      : row.iv !== null
        ? clamp(((row.iv - 0.15) / 0.5) * 100)
        : 0;
  const volEdgeBasis: ResearchScores["volEdgeBasis"] =
    row.ivRv !== null
      ? "IV/RV30"
      : row.ivToIv30 !== null
        ? "Contract IV/IV30"
        : "IV only";

  const oi = row.openInterest ?? 0;
  const oiScore = clamp((Math.log10(Math.max(1, oi)) - 2) * 50);
  const spreadScore =
    row.spreadPct === null ? 20 : clamp(((0.2 - row.spreadPct) / 0.18) * 100);
  const volumeScore = row.volume === null ? 40 : clamp(Math.log10(row.volume + 1) * 30);
  const executionScore = round(oiScore * 0.45 + spreadScore * 0.45 + volumeScore * 0.1);

  const annualizedScore = clamp(((row.rocAnnualized - 0.05) / 0.3) * 100);
  const bufferScore = clamp((row.otmPct / 0.2) * 100);
  const probabilityScore = row.pItm === null ? 50 : clamp((1 - row.pItm) * 100);
  const eventScore = row.earningsDate ? 0 : row.eventDataAvailable ? 100 : 50;
  const carryScore = round(
    annualizedScore * 0.45 + bufferScore * 0.3 + probabilityScore * 0.2 + eventScore * 0.05,
  );

  return { volEdgeScore: round(volEdgeScore), volEdgeBasis, executionScore, carryScore };
}

function scoreOne(
  row: ScreenerRow,
  peers: FundamentalSnapshot[],
): ResearchScores {
  const snapshot = row.fundamentals;
  const financial = row.sector === "Financials";
  const valuationMetrics = metricRows(
    snapshot,
    peers,
    financial ? FINANCIAL_VALUATION : STANDARD_VALUATION,
  );
  const qualityMetrics = metricRows(
    snapshot,
    peers,
    financial ? FINANCIAL_QUALITY : STANDARD_QUALITY,
  );

  const valuationPercentile = average(valuationMetrics.map((metric) => metric.percentile));
  const valuationScore = valuationPercentile === null ? null : 100 - valuationPercentile;
  const qualityScore = average(
    qualityMetrics.map((metric) => {
      if (metric.percentile === null) return null;
      return metric.favorable === "high" ? metric.percentile : 100 - metric.percentile;
    }),
  );
  const assignmentScore =
    valuationScore === null || qualityScore === null
      ? null
      : valuationScore * 0.55 + qualityScore * 0.45;
  const option = optionFactors(row);
  const underwriteScore =
    assignmentScore === null
      ? null
      : assignmentScore * 0.45 +
        option.volEdgeScore * 0.25 +
        option.executionScore * 0.2 +
        option.carryScore * 0.1;

  const missingEvidence: string[] = [];
  if (snapshot.source === "unavailable") missingEvidence.push(snapshot.note ?? "Fundamentals unavailable");
  if (valuationPercentile === null && snapshot.source !== "not-applicable") {
    missingEvidence.push("Insufficient comparable valuation metrics");
  }
  if (qualityScore === null && snapshot.source !== "not-applicable") {
    missingEvidence.push("Insufficient comparable quality metrics");
  }
  if (row.ivRv === null) missingEvidence.push("30-day realized volatility unavailable");
  if (!row.eventDataAvailable) missingEvidence.push("Forward event calendar unavailable");

  const evidenceCoverage =
    snapshot.source === "not-applicable" ? 0.45 : snapshot.coverage * 0.7;
  const volCoverage = row.ivRv !== null ? 0.2 : row.ivToIv30 !== null ? 0.12 : 0.04;
  const eventCoverage = row.eventDataAvailable ? 0.1 : 0.04;

  return {
    underwriteScore: underwriteScore === null ? null : round(underwriteScore),
    assignmentScore: assignmentScore === null ? null : round(assignmentScore),
    valuationScore: valuationScore === null ? null : round(valuationScore),
    valuationPercentile:
      valuationPercentile === null ? null : round(valuationPercentile),
    valuationLabel: valuationLabel(valuationPercentile, snapshot),
    qualityScore: qualityScore === null ? null : round(qualityScore),
    volEdgeScore: option.volEdgeScore,
    volEdgeBasis: option.volEdgeBasis,
    executionScore: option.executionScore,
    carryScore: option.carryScore,
    confidence: round(clamp((evidenceCoverage + volCoverage + eventCoverage) * 100)),
    peerCount: peers.length,
    peerLabel: financial ? `${row.sector} peers` : `${row.sector} peers`,
    valuationMetrics,
    qualityMetrics,
    missingEvidence,
  };
}

/** Re-ranks loaded rows as each scan batch adds to the sector peer set. */
export function rankResearchRows(rows: ScreenerRow[]): ResearchRow[] {
  const snapshots = new Map<string, FundamentalSnapshot>();
  const sectors = new Map<string, FundamentalSnapshot[]>();
  for (const row of rows) {
    if (!snapshots.has(row.symbol)) snapshots.set(row.symbol, row.fundamentals);
  }
  for (const row of rows) {
    const snapshot = snapshots.get(row.symbol);
    if (!snapshot || snapshot.source === "not-applicable" || snapshot.source === "unavailable") {
      continue;
    }
    const list = sectors.get(row.sector) ?? [];
    if (!list.some((item) => item.symbol === snapshot.symbol)) list.push(snapshot);
    sectors.set(row.sector, list);
  }

  return rows.map((row) => ({
    ...row,
    research: scoreOne(row, sectors.get(row.sector) ?? []),
  }));
}

