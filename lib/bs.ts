import type { OptionType } from "@/lib/types";

/** Standard normal CDF (Abramowitz & Stegun 7.1.26 approximation). */
export function normCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * absX);
  const poly =
    t *
    (0.254829592 +
      t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const erf = 1 - poly * Math.exp(-absX * absX);
  return 0.5 * (1 + sign * erf);
}

type BsInputs = {
  spot: number;
  strike: number;
  /** Implied volatility, decimal */
  iv: number;
  /** Time to expiry in years */
  t: number;
  /** Risk-free rate, decimal */
  rate?: number;
};

const DEFAULT_RATE = 0.04;

function d1d2({ spot, strike, iv, t, rate = DEFAULT_RATE }: BsInputs) {
  const sqrtT = Math.sqrt(t);
  const d1 = (Math.log(spot / strike) + (rate + (iv * iv) / 2) * t) / (iv * sqrtT);
  return { d1, d2: d1 - iv * sqrtT };
}

/**
 * Model probability the option expires in the money: N(d2) for calls, N(-d2) for puts.
 * A Black-Scholes estimate, not a market-observed value.
 */
export function probabilityItm(type: OptionType, inputs: BsInputs): number | null {
  if (inputs.spot <= 0 || inputs.strike <= 0 || inputs.iv <= 0 || inputs.t <= 0) return null;
  const { d2 } = d1d2(inputs);
  return type === "call" ? normCdf(d2) : normCdf(-d2);
}

/** Black-Scholes delta, used only to fill gaps when the vendor omits greeks. */
export function bsDelta(type: OptionType, inputs: BsInputs): number | null {
  if (inputs.spot <= 0 || inputs.strike <= 0 || inputs.iv <= 0 || inputs.t <= 0) return null;
  const { d1 } = d1d2(inputs);
  return type === "call" ? normCdf(d1) : normCdf(d1) - 1;
}

/** Annualized realized volatility from daily closes (log returns, sqrt(252)). */
export function realizedVol(closes: number[], window = 30): number | null {
  if (closes.length < window + 1) return null;
  const recent = closes.slice(-(window + 1));
  const returns: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    if (recent[i - 1] > 0 && recent[i] > 0) {
      returns.push(Math.log(recent[i] / recent[i - 1]));
    }
  }
  if (returns.length < 2) return null;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance =
    returns.reduce((acc, r) => acc + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}
