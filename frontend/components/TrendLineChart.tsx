"use client";

import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { LINE, MUTED, PALETTE } from "./ui";

type Series = { key: string; label: string; color?: string };

export default function TrendLineChart({
  data,
  xKey,
  series,
  height = 260,
  yDomain,
}: {
  data: Record<string, unknown>[];
  xKey: string;
  series: Series[];
  height?: number;
  yDomain?: [number | "auto", number | "auto"];
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={LINE} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={{ stroke: LINE }} />
        <YAxis tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} domain={yDomain} width={44} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${LINE}` }}
          labelStyle={{ color: MUTED }}
        />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color || PALETTE[i % PALETTE.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
