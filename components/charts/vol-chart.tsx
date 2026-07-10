"use client";

import {
  CartesianGrid,
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

type Props = {
  rvSeries: Array<{ date: string; rv: number }>;
  /** Current 30-day implied vol, decimal */
  iv30: number | null;
};

/** Trailing 30-day realized vol with the current implied level overlaid. */
export function VolChart({ rvSeries, iv30 }: Props) {
  if (rvSeries.length === 0) return null;
  const data = rvSeries.map((point) => ({
    date: point.date,
    rv: Number((point.rv * 100).toFixed(1)),
  }));
  const ivPct = iv30 === null ? null : Number((iv30 * 100).toFixed(1));
  const values = [...data.map((point) => point.rv), ...(ivPct === null ? [] : [ivPct])];
  const max = Math.max(...values) * 1.15;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 44, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={CHART.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tick={AXIS_TICK}
          tickFormatter={(value: string) => fmtDate(value)}
          tickLine={false}
          axisLine={{ stroke: CHART.grid }}
          minTickGap={48}
        />
        <YAxis
          domain={[0, max]}
          tick={AXIS_TICK}
          tickFormatter={(value: number) => `${Math.round(value)}%`}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(value) => [`${value}%`, "30-day realized vol"]}
          labelFormatter={(label) => fmtDate(String(label))}
        />
        {ivPct !== null && (
          <ReferenceLine
            y={ivPct}
            stroke={CHART.series[1]}
            strokeDasharray="4 4"
            label={{
              value: `IV30 ${ivPct}%`,
              position: "right",
              fill: CHART.series[1],
              fontSize: 10,
            }}
          />
        )}
        <Line
          type="monotone"
          dataKey="rv"
          stroke={CHART.series[0]}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, stroke: "#000000", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
