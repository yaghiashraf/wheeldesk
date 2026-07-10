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
import { fmtDate, fmtMoney } from "@/lib/format";

type Props = {
  bars: Array<{ date: string; close: number }>;
  spot: number;
  /** Candidate put strikes to overlay as horizontal levels */
  strikes: number[];
};

export function PriceChart({ bars, spot, strikes }: Props) {
  if (bars.length === 0) return null;
  const values = [...bars.map((bar) => bar.close), spot, ...strikes];
  const min = Math.min(...values) * 0.97;
  const max = Math.max(...values) * 1.03;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={bars} margin={{ top: 8, right: 44, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={CHART.grid} strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="date"
          tick={AXIS_TICK}
          tickFormatter={(value: string) => fmtDate(value)}
          tickLine={false}
          axisLine={{ stroke: CHART.grid }}
          minTickGap={48}
        />
        <YAxis
          domain={[min, max]}
          tick={AXIS_TICK}
          tickFormatter={(value: number) => `$${Math.round(value)}`}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(value) => [fmtMoney(Number(value)), "Close"]}
          labelFormatter={(label) => fmtDate(String(label))}
        />
        {strikes.map((strike) => (
          <ReferenceLine
            key={strike}
            y={strike}
            stroke={CHART.teal}
            strokeDasharray="4 4"
            strokeOpacity={0.8}
            label={{
              value: `$${strike}`,
              position: "right",
              fill: CHART.teal,
              fontSize: 10,
            }}
          />
        ))}
        <ReferenceLine
          y={spot}
          stroke={CHART.secondary}
          strokeDasharray="2 3"
          label={{
            value: "spot",
            position: "right",
            fill: CHART.secondary,
            fontSize: 10,
          }}
        />
        <Line
          type="monotone"
          dataKey="close"
          stroke={CHART.series[0]}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, stroke: "#000000", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
