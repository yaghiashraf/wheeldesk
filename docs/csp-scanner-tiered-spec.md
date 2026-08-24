# WheelDesk tiered CSP scanner spec

## Decision path

`Choose scan preset -> run the watchlist -> filter by setup tier -> select a contract -> size contracts -> stress assignment -> shortlist`

## Setup tiers

The tiers are deterministic research buckets, not recommendations or mutually
exclusive risk ratings. A contract is assigned to the first matching bucket.

1. **Fallen general**: stock is at least 12% below its 52-week high, peer-quality
   score is at least 55, peer valuation is at or below P50, and the one-month
   move is not worse than -12%.
2. **Quality carry**: peer-quality score is at least 60, peer valuation is at or
   below P65, and the premium-adjusted buffer covers at least 0.65x the expected
   move.
3. **Premium-rich**: volatility-edge score is at least 60, period premium ROI is
   at least 2%, and execution score is at least 45.
4. **Watch**: the contract passes the active contract mandate but does not match
   a tier above, or evidence is missing.

The underwrite status remains independent. A fallen-general match can still be
risk-flagged by earnings, leverage, cycle normalization, execution, or another
binding gate.

## Economics definitions

- **Premium @ mid**: `(bid + ask) / 2 x 100 x contracts`.
- **Bid floor**: `bid x 100 x contracts`; displayed so the midpoint is not
  mistaken for a guaranteed fill.
- **ROI on strike** for CSPs: `premium @ mid / (strike x 100 x contracts)`.
- **Collateral** for CSPs: `strike x 100 x contracts`.
- Annualized ROI is displayed as context, while the period ROI is primary.

## Design system

- Background `#07080a`; surfaces `#0d0f13`, `#14171d`; borders `#23262e` and
  `#333843`.
- Text `#e8eaee`, secondary `#a8aeba`, muted `#767d8a`.
- Cyan is selection/action, teal is positive evidence, amber is review, coral
  is risk. No decorative gradients or glow beyond a selected-row edge.
- Geist Sans for interface text and Geist Mono/tabular numerals for prices,
  percentages, dates, and counts.
- Open rails, tables, and dividers are the container model. Rounded cards are
  reserved for controls, empty states, and grouped underwrite sections.

## Primary surfaces

- Desktop: compact preset rail, thin scan progress, tier tabs, comparison table,
  sticky inspector, and shortlist totals.
- Mobile Candidates: preset summary, progress, tier tabs, open candidate list,
  and a sticky selected-contract action.
- Mobile Underwrite: premium and ROI first, price/setup rail, capital sizing,
  expiry stress, evidence accordions, and sticky actions.

## Concept files

- `docs/csp-scanner-tiered-concept.png`
- `docs/csp-scanner-tiered-mobile-candidates.png`
- `docs/csp-scanner-tiered-mobile-underwrite.png`
