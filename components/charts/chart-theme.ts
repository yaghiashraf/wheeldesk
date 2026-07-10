/**
 * Quant Research Desk chart tokens: pure black surface, neon series in fixed
 * order (cyan, magenta, amber), white tick labels, gray secondary text.
 * Palette validated for CVD separation and contrast on #000000.
 */
export const CHART = {
  series: ["#00E5FF", "#FF2E9A", "#FFB800"] as const,
  teal: "#00D4AA",
  coral: "#FF3B4A",
  grid: "#1F1F24",
  tick: "#F5F5F5",
  secondary: "#B8B8B8",
  muted: "#71717A",
} as const;

export const AXIS_TICK = { fill: CHART.tick, fontSize: 11 } as const;

export const TOOLTIP_STYLE = {
  contentStyle: {
    background: "#0A0A0C",
    border: "1px solid #2C2C33",
    borderRadius: 8,
    fontSize: 12,
    color: "#F5F5F5",
  },
  labelStyle: { color: "#B8B8B8" },
} as const;
