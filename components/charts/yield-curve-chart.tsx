"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AXIS_TICK, CHART, TOOLTIP_STYLE } from "@/components/charts/chart-theme";
import { fmtDate } from "@/lib/format";
import type { ExpirationLadder } from "@/lib/ticker";

type Props = {
  ladders: ExpirationLadder[];
  spot: number;
};

/** Annualized premium yield vs strike, one line per expiration (max 3). */
export function YieldCurveChart({ ladders, spot }: Props) {
  const visible = ladders.slice(0, 3).filter((ladder) => ladder.rows.length >= 2);
  if (visible.length === 0) return null;

  const strikes = [
    ...new Set(visible.flatMap((ladder) => ladder.rows.map((row) => row.strike))),
  ].sort((a, b) => a - b);

  const data = strikes.map((strike) => {
    const point: Record<string, number | null> = { strike };
    for (const ladder of visible) {
      const row = ladder.rows.find((candidate) => candidate.strike === strike);
      point[ladder.expiration] = row ? Number((row.rocAnnualized * 100).toFixed(2)) : null;
    }
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="strike"
          type="number"
          domain={["dataMin", "dataMax"]}
          tick={AXIS_TICK}
          tickFormatter={(value: number) => `$${value}`}
          tickLine={false}
          axisLine={{ stroke: CHART.grid }}
        />
        <YAxis
          tick={AXIS_TICK}
          tickFormatter={(value: number) => `${value}%`}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(value, name) => [`${value}%`, `${fmtDate(String(name))} annualized`]}
          labelFormatter={(label) => `Strike $${label}`}
        />
        <Legend
          formatter={(value: string) => (
            <span style={{ color: CHART.secondary, fontSize: 11 }}>
              {fmtDate(value)}
            </span>
          )}
        />
        <ReferenceLine
          x={spot}
          stroke={CHART.secondary}
          strokeDasharray="2 3"
          label={{ value: "spot", position: "top", fill: CHART.secondary, fontSize: 10 }}
        />
        {visible.map((ladder, index) => (
          <Line
            key={ladder.expiration}
            dataKey={ladder.expiration}
            type="monotone"
            connectNulls
            stroke={CHART.series[index]}
            strokeWidth={2}
            dot={{ r: 2.5, fill: CHART.series[index], strokeWidth: 0 }}
            activeDot={{ r: 4, stroke: "#000000", strokeWidth: 2 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
