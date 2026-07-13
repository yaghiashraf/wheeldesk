import type {
  FundamentalPeerSnapshot,
  FundamentalSnapshot,
  ScreenerRow,
} from "@/lib/types";

export type FactorMetric = {
  key: keyof FundamentalSnapshot;
  label: string;
  value: number | null;
  percentile: number | null;
  format: "multiple" | "percent";
  favorable: "low" | "high";
};

export type UnderwriteStatus = "ADVANCE" | "REVIEW" | "GATED" | "DATA GAP";

export type ResearchScores = {
  underwriteScore: number | null;
  assignmentScore: number | null;
  valuationScore: number | null;
  valuationPercentile: number | null;
  valuationLabel: string;
  qualityScore: number | null;
  cycleDurabilityScore: number | null;
  volEdgeScore: number;
  volEdgeBasis: "IV/RV30" | "Contract IV/IV30" | "IV only";
  extremeIvPenalty: number;
  executionScore: number;
  tailRiskScore: number;
  carryScore: number;
  expectedMovePct: number | null;
  expectedMoveCoverage: number | null;
  riskBufferPct: number;
  effectivePe: number | null;
  effectiveNormalizedPe: number | null;
  effectivePriceToFcf: number | null;
  status: UnderwriteStatus;
  bindingRisk: string;
  confidence: number;
  peerCount: number;
  peerLabel: string;
  peerFallback: boolean;
  valuationMetrics: FactorMetric[];
  qualityMetrics: FactorMetric[];
  missingEvidence: string[];
};

export type ResearchRow = ScreenerRow & { research: ResearchScores };

type MetricSpec = Pick<FactorMetric, "key" | "label" | "format" | "favorable">;

const STANDARD_VALUATION: MetricSpec[] = [
  { key: "peTtm", label: "Effective P/E", format: "multiple", favorable: "low" },
  { key: "evEbitdaTtm", label: "EV / EBITDA", format: "multiple", favorable: "low" },
  { key: "priceToFcfTtm", label: "Effective P / FCF", format: "multiple", favorable: "low" },
];

const CYCLICAL_VALUATION: MetricSpec[] = [
  { key: "normalizedPe", label: "Effective normalized P/E", format: "multiple", favorable: "low" },
  { key: "evEbitdaTtm", label: "EV / EBITDA (TTM)", format: "multiple", favorable: "low" },
  { key: "normalizedPriceToFcf", label: "Effective normalized P / FCF", format: "multiple", favorable: "low" },
];

const FINANCIAL_VALUATION: MetricSpec[] = [
  { key: "peTtm", label: "Effective P/E", format: "multiple", favorable: "low" },
  { key: "priceToBookTtm", label: "P / Book", format: "multiple", favorable: "low" },
];

const STANDARD_QUALITY: MetricSpec[] = [
  { key: "roicTtm", label: "ROIC (TTM)", format: "percent", favorable: "high" },
  { key: "operatingMarginTtm", label: "Operating margin", format: "percent", favorable: "high" },
  { key: "fcfMarginTtm", label: "FCF margin", format: "percent", favorable: "high" },
  { key: "netDebtToEbitdaTtm", label: "Net debt / EBITDA", format: "multiple", favorable: "low" },
];

const FINANCIAL_QUALITY: MetricSpec[] = [
  { key: "roeTtm", label: "ROE (TTM)", format: "percent", favorable: "high" },
  { key: "netMarginTtm", label: "Net margin", format: "percent", favorable: "high" },
];

const CYCLICAL_SECTORS = new Set(["Semiconductors", "Energy", "Materials"]);

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
  const below = valid.filter((item) => item < value).length;
  const equal = valid.filter((item) => item === value).length;
  return ((below + Math.max(0, equal - 1) / 2) / Math.max(1, valid.length - 1)) * 100;
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

function labelValuation(value: number | null, snapshot: FundamentalSnapshot): string {
  if (snapshot.source === "not-applicable") return "ETF · N/A";
  if (snapshot.source === "unavailable") return "Data gap";
  if (value === null) return "Peer set thin";
  if (value <= 20) return "Deep discount";
  if (value <= 40) return "Discount";
  if (value <= 60) return "Fair";
  if (value <= 80) return "Premium";
  return "Rich";
}

function effectiveSnapshot(row: ScreenerRow): FundamentalSnapshot {
  const basisRatio = row.strategy === "csp" ? row.breakeven / row.spot : 1;
  const multiply = (value: number | null) => (value === null ? null : value * basisRatio);
  return {
    ...row.fundamentals,
    peTtm: multiply(row.fundamentals.peTtm),
    priceToFcfTtm: multiply(row.fundamentals.priceToFcfTtm),
    normalizedPe: multiply(row.fundamentals.normalizedPe),
    normalizedPriceToFcf: multiply(row.fundamentals.normalizedPriceToFcf),
  };
}

function optionFactors(row: ScreenerRow) {
  const volBasis = row.ivRv ?? row.ivToIv30;
  const rawVolScore =
    volBasis !== null
      ? clamp(((volBasis - 0.85) / 0.65) * 100)
      : row.iv !== null
        ? 25
        : 0;
  const absoluteIv = row.iv30 ?? row.iv;
  const highIvSeverity = absoluteIv === null ? 0 : clamp((absoluteIv - 0.45) / 0.55, 0, 1);
  const weakRichness = volBasis === null ? 1 : clamp((1.25 - volBasis) / 0.3, 0, 1);
  const extremeIvPenalty = round(35 * highIvSeverity * weakRichness);
  const volEdgeScore = round(clamp(rawVolScore - extremeIvPenalty));
  const volEdgeBasis: ResearchScores["volEdgeBasis"] =
    row.ivRv !== null ? "IV/RV30" : row.ivToIv30 !== null ? "Contract IV/IV30" : "IV only";

  const oiScore = clamp((Math.log10(Math.max(1, row.openInterest ?? 0)) - 2) * 50);
  const spreadScore = row.spreadPct === null ? 20 : clamp(((0.2 - row.spreadPct) / 0.18) * 100);
  const volumeScore = row.volume === null ? 40 : clamp(Math.log10(row.volume + 1) * 30);
  const executionScore = round(oiScore * 0.45 + spreadScore * 0.45 + volumeScore * 0.1);

  const expectedVol = row.iv30 ?? row.iv;
  const expectedMovePct = expectedVol === null ? null : expectedVol * Math.sqrt(row.dte / 365);
  const riskBufferPct =
    row.strategy === "csp" ? Math.max(0, (row.spot - row.breakeven) / row.spot) : Math.max(0, row.otmPct);
  const expectedMoveCoverage =
    expectedMovePct !== null && expectedMovePct > 0 ? riskBufferPct / expectedMovePct : null;
  const coverageScore = expectedMoveCoverage === null ? 20 : clamp(((expectedMoveCoverage - 0.4) / 1) * 100);
  const probabilityScore = row.pItm === null ? 35 : clamp((1 - row.pItm) * 100);
  const tailRiskScore = round(coverageScore * 0.72 + probabilityScore * 0.28);

  const annualizedScore = clamp(((row.rocAnnualized - 0.05) / 0.3) * 100);
  const eventScore = row.earningsDate ? 0 : row.eventDataAvailable ? 100 : 35;
  const carryScore = round(annualizedScore * 0.7 + probabilityScore * 0.2 + eventScore * 0.1);

  return {
    volEdgeScore,
    volEdgeBasis,
    extremeIvPenalty,
    executionScore,
    tailRiskScore,
    carryScore,
    expectedMovePct,
    expectedMoveCoverage,
    riskBufferPct,
  };
}

function selectPeers(row: ScreenerRow, universe: FundamentalPeerSnapshot[]) {
  const eligible = universe.filter(
    (peer) =>
      peer.kind === "stock" &&
      peer.fundamentals.source !== "unavailable" &&
      peer.fundamentals.source !== "not-applicable",
  );
  const group = eligible.filter((peer) => peer.peerGroup === row.peerGroup);
  if (group.length >= 3) {
    return { peers: group.map((peer) => peer.fundamentals), label: row.peerGroup, fallback: false };
  }
  const sector = eligible.filter((peer) => peer.sector === row.sector);
  return {
    peers: sector.map((peer) => peer.fundamentals),
    label: `${row.sector} fallback · ${row.peerGroup} cohort has ${group.length}`,
    fallback: row.peerGroup !== row.sector,
  };
}

function scoreOne(row: ScreenerRow, universe: FundamentalPeerSnapshot[]): ResearchScores {
  const snapshot = row.fundamentals;
  const effective = effectiveSnapshot(row);
  const peerSelection = selectPeers(row, universe);
  const financial = row.sector === "Financials";
  const cyclical = CYCLICAL_SECTORS.has(row.sector);
  const valuationMetrics = metricRows(
    effective,
    peerSelection.peers,
    financial ? FINANCIAL_VALUATION : cyclical ? CYCLICAL_VALUATION : STANDARD_VALUATION,
  );
  const qualityMetrics = metricRows(
    snapshot,
    peerSelection.peers,
    financial ? FINANCIAL_QUALITY : STANDARD_QUALITY,
  );

  const valuationPercentile = average(valuationMetrics.map((metric) => metric.percentile));
  const valuationScore = valuationPercentile === null ? null : 100 - valuationPercentile;
  const qualityScore = average(
    qualityMetrics.map((metric) =>
      metric.percentile === null
        ? null
        : metric.favorable === "high"
          ? metric.percentile
          : 100 - metric.percentile,
    ),
  );
  const cycleRatio = snapshot.earningsCycleRatio;
  const cycleDurabilityScore =
    cycleRatio === null ? null : round(clamp(((2.5 - cycleRatio) / 1.4) * 100));
  const cycleWeight = cyclical ? 0.2 : 0;
  const baseWeights = cyclical ? [0.45, 0.35, cycleWeight] : [0.55, 0.45, 0];
  const assignmentScore =
    valuationScore === null || qualityScore === null || (cyclical && cycleDurabilityScore === null)
      ? null
      : valuationScore * baseWeights[0] +
        qualityScore * baseWeights[1] +
        (cycleDurabilityScore ?? 0) * baseWeights[2];
  const option = optionFactors(row);
  let underwriteScore =
    assignmentScore === null
      ? null
      : assignmentScore * 0.35 +
        option.tailRiskScore * 0.25 +
        option.volEdgeScore * 0.15 +
        option.executionScore * 0.15 +
        option.carryScore * 0.1;

  const risks: string[] = [];
  if (option.expectedMoveCoverage === null) risks.push("Expected-move evidence unavailable");
  else if (option.expectedMoveCoverage < 0.75) {
    risks.push("Premium-adjusted buffer is inside 0.75× expected move");
    if (underwriteScore !== null) underwriteScore = Math.min(underwriteScore, 54);
  }
  if (cyclical && cycleRatio !== null && cycleRatio > 1.75) {
    risks.push(`TTM net margin is ${cycleRatio.toFixed(1)}× its through-cycle median`);
    if (underwriteScore !== null) underwriteScore = Math.min(underwriteScore, 59);
  }
  if (option.extremeIvPenalty >= 15) {
    risks.push("Extreme absolute IV is not matched by relative volatility richness");
    if (underwriteScore !== null) underwriteScore = Math.min(underwriteScore, 58);
  }
  if (valuationPercentile !== null && valuationPercentile > 80) {
    risks.push("Effective entry valuation is rich versus the comparison set");
  }
  if (row.earningsDate) risks.push("Known earnings event falls inside the contract window");

  const missingEvidence: string[] = [];
  if (snapshot.source === "unavailable") missingEvidence.push(snapshot.note ?? "Fundamentals unavailable");
  if (valuationPercentile === null && snapshot.source !== "not-applicable") {
    missingEvidence.push("Insufficient independent peer valuation observations");
  }
  if (qualityScore === null && snapshot.source !== "not-applicable") {
    missingEvidence.push("Insufficient independent peer quality observations");
  }
  if (cyclical && snapshot.annualHistoryYears < 3) {
    missingEvidence.push("Less than three annual periods for cycle normalization");
  }
  if (peerSelection.fallback) missingEvidence.push(`Business-model peer set thin; using ${row.sector} fallback`);
  if (row.ivRv === null) missingEvidence.push("30-day realized volatility unavailable");
  if (!row.eventDataAvailable) missingEvidence.push("Forward event calendar unavailable");

  const evidenceCoverage = snapshot.source === "not-applicable" ? 0.35 : snapshot.coverage * 0.56;
  const cycleCoverage = !cyclical ? 0.12 : snapshot.annualHistoryYears >= 3 ? 0.12 : 0.03;
  const peerCoverage = peerSelection.peers.length >= 5 ? 0.12 : peerSelection.peers.length >= 3 ? 0.08 : 0.02;
  const volCoverage = row.ivRv !== null ? 0.12 : row.ivToIv30 !== null ? 0.08 : 0.02;
  const eventCoverage = row.eventDataAvailable ? 0.08 : 0.02;
  const rawConfidence = round(clamp((evidenceCoverage + cycleCoverage + peerCoverage + volCoverage + eventCoverage) * 100));
  const confidence = Math.min(
    rawConfidence,
    peerSelection.fallback ? 72 : 100,
    row.ivRv === null ? 85 : 100,
  );

  let status: UnderwriteStatus;
  if (underwriteScore === null) status = "DATA GAP";
  else if (
    (option.expectedMoveCoverage !== null && option.expectedMoveCoverage < 0.75) ||
    (cyclical && cycleRatio !== null && cycleRatio > 1.75) ||
    option.extremeIvPenalty >= 15 ||
    row.earningsDate !== null
  ) status = "GATED";
  else if (underwriteScore >= 70 && confidence >= 65 && (valuationPercentile ?? 100) <= 80) status = "ADVANCE";
  else status = "REVIEW";

  const bindingRisk =
    risks[0] ??
    (missingEvidence.length > 0 ? missingEvidence[0] : "No binding screen-level risk; complete security-level diligence");

  return {
    underwriteScore: underwriteScore === null ? null : round(underwriteScore),
    assignmentScore: assignmentScore === null ? null : round(assignmentScore),
    valuationScore: valuationScore === null ? null : round(valuationScore),
    valuationPercentile: valuationPercentile === null ? null : round(valuationPercentile),
    valuationLabel: labelValuation(valuationPercentile, snapshot),
    qualityScore: qualityScore === null ? null : round(qualityScore),
    cycleDurabilityScore,
    volEdgeScore: option.volEdgeScore,
    volEdgeBasis: option.volEdgeBasis,
    extremeIvPenalty: option.extremeIvPenalty,
    executionScore: option.executionScore,
    tailRiskScore: option.tailRiskScore,
    carryScore: option.carryScore,
    expectedMovePct: option.expectedMovePct,
    expectedMoveCoverage: option.expectedMoveCoverage,
    riskBufferPct: option.riskBufferPct,
    effectivePe: effective.peTtm,
    effectiveNormalizedPe: effective.normalizedPe,
    effectivePriceToFcf: effective.priceToFcfTtm,
    status,
    bindingRisk,
    confidence,
    peerCount: peerSelection.peers.length,
    peerLabel: peerSelection.label,
    peerFallback: peerSelection.fallback,
    valuationMetrics,
    qualityMetrics,
    missingEvidence,
  };
}

/** Rank contracts against fundamentals for every scanned security, not qualifiers only. */
export function rankResearchRows(
  rows: ScreenerRow[],
  fundamentalUniverse: FundamentalPeerSnapshot[],
): ResearchRow[] {
  return rows.map((row) => ({ ...row, research: scoreOne(row, fundamentalUniverse) }));
}
