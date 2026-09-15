import type { ResearchRow, UnderwriteStatus } from "@/lib/research";

export function researchStatusLabel(status: UnderwriteStatus): string {
  if (status === "ADVANCE") return "Ready to consider";
  if (status === "REVIEW") return "Needs review";
  if (status === "GATED") return "Risk flagged";
  return "Missing data";
}

export function reviewScoreLabel(row: ResearchRow): string {
  const score = row.research.underwriteScore;
  return score === null ? "Score unavailable" : `Score ${score}/100`;
}

function asSentence(value: string): string {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function plainLanguageReason(reason: string): string {
  if (reason === "Expected-move evidence unavailable") {
    return "Expected-move data is unavailable, so the downside cushion cannot be fully checked.";
  }
  if (reason === "Extreme absolute IV is not matched by relative volatility richness") {
    return "Implied volatility is high, but the premium is not rich versus the stock's recent movement.";
  }
  if (reason === "Known earnings event falls inside the contract window") {
    return "Earnings are scheduled before this contract expires.";
  }
  if (reason === "Insufficient independent peer valuation observations") {
    return "Too few comparable companies have usable valuation data.";
  }
  if (reason === "Insufficient independent peer quality observations") {
    return "Too few comparable companies have usable quality data.";
  }
  if (reason === "Less than three annual periods for cycle normalization") {
    return "Fewer than three years of history are available to judge a full business cycle.";
  }
  if (reason === "Forward event calendar unavailable") {
    return "The upcoming earnings and dividend calendar is unavailable.";
  }
  if (reason === "Fundamentals unavailable") {
    return "Recent company financial data is unavailable.";
  }

  const buffer = reason.match(/^Premium-adjusted buffer is inside ([\d.]+)× expected move$/);
  if (buffer) {
    return `The breakeven cushion covers less than ${Math.round(Number(buffer[1]) * 100)}% of the move priced in by the options market.`;
  }
  const cycle = reason.match(/^TTM net margin is ([\d.]+)× its through-cycle median$/);
  if (cycle) {
    return `Current profit margins are ${cycle[1]} times their longer-term norm, so earnings may be unusually high.`;
  }
  const valuation = reason.match(/^Effective entry valuation exceeds the P(\d+) preference$/);
  if (valuation) {
    return `The effective entry price is more expensive than the preferred ${valuation[1]}th-percentile limit.`;
  }
  const quality = reason.match(/^Peer-relative quality is below the (\d+) preference$/);
  if (quality) {
    return `Company quality scores below the preferred minimum of ${quality[1]}/100.`;
  }
  const oneMonth = reason.match(/^One-month price decline remains severe \((-?[\d.]+)%\)$/);
  if (oneMonth) {
    return `The stock has fallen ${Math.abs(Number(oneMonth[1])).toFixed(1)}% over the past month.`;
  }
  const threeMonth = reason.match(/^Three-month drawdown remains severe \((-?[\d.]+)%\)$/);
  if (threeMonth) {
    return `The stock has fallen ${Math.abs(Number(threeMonth[1])).toFixed(1)}% over the past three months.`;
  }
  const peerFallback = reason.match(/^Business-model peer set thin; using (.+) fallback$/);
  if (peerFallback) {
    return `Too few close business peers are available, so the score uses broader ${peerFallback[1]}-sector comparisons.`;
  }
  if (reason.startsWith("52-week price context unavailable")) {
    return "There is not enough price history to compare this stock with its 52-week high.";
  }

  return asSentence(reason);
}

export function reviewCommentFor(row: ResearchRow): string {
  const research = row.research;

  if (research.status === "DATA GAP") {
    return research.missingEvidence[0]
      ? plainLanguageReason(research.missingEvidence[0])
      : "There is not enough verified data to score this setup.";
  }

  if (research.status === "GATED") return plainLanguageReason(research.bindingRisk);

  if (
    research.status === "REVIEW" &&
    research.underwriteScore !== null &&
    research.underwriteScore >= 70 &&
    research.confidence < 65
  ) {
    return research.missingEvidence[0]
      ? `The score passed, but data confidence is ${research.confidence}%. ${plainLanguageReason(research.missingEvidence[0])}`
      : `The score passed, but data confidence is only ${research.confidence}%; verify the supporting data.`;
  }

  if (
    research.status === "REVIEW" &&
    !research.bindingRisk.startsWith("No binding screen-level risk")
  ) {
    return plainLanguageReason(research.bindingRisk);
  }

  const factors = [
    {
      score: research.assignmentScore,
      comment: "Company quality or entry value is the weakest part of this setup.",
    },
    {
      score: research.tailRiskScore,
      comment: "The downside buffer is the weakest part of this setup.",
    },
    {
      score: research.executionScore,
      comment: "Liquidity or the bid/ask spread weakens this setup.",
    },
    {
      score: research.carryScore,
      comment: "The premium return is modest for the capital at risk.",
    },
  ].filter((factor): factor is { score: number; comment: string } => factor.score !== null);
  const weakest = factors.reduce<(typeof factors)[number] | null>(
    (current, factor) => current === null || factor.score < current.score ? factor : current,
    null,
  );

  if (research.status === "ADVANCE") {
    return research.opportunityReasons[0]
      ? plainLanguageReason(research.opportunityReasons[0])
      : "The setup passed the screen; complete final company-level diligence.";
  }

  return weakest?.comment ?? "This setup needs deeper review before it is ready to consider.";
}
