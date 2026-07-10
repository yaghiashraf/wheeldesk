import type { OptionType } from "@/lib/types";

export type ParsedOcc = {
  underlying: string;
  expiration: string;
  type: OptionType;
  strike: number;
};

/**
 * Parse an OCC option symbol, e.g. AAPL261016C00540000.
 * Layout from the end: 8-digit strike (x1000), 1-char C/P, 6-digit YYMMDD;
 * everything before that is the (variable-length) underlying root.
 */
export function parseOccSymbol(occ: string): ParsedOcc | null {
  const match = /^([A-Z.]{1,6})(\d{6})([CP])(\d{8})$/.exec(occ.trim().toUpperCase());
  if (!match) return null;

  const [, root, yymmdd, cp, strikeRaw] = match;
  const year = 2000 + Number(yymmdd.slice(0, 2));
  const month = yymmdd.slice(2, 4);
  const day = yymmdd.slice(4, 6);

  return {
    underlying: root,
    expiration: `${year}-${month}-${day}`,
    type: cp === "C" ? "call" : "put",
    strike: Number(strikeRaw) / 1000,
  };
}

/** Calendar days until expiration, counting the expiration day's 4pm ET close. */
export function daysToExpiration(expiration: string, now: Date = new Date()): number {
  const expiry = new Date(`${expiration}T16:00:00-04:00`);
  return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000));
}
