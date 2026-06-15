"use client";

import {
  Bar, BarChart as RBarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ACCENT, LINE, MUTED, PALETTE } from "./ui";

export default function BarChart({
  data,
  categoryKey,
  valueKey,
  layout = "vertical",     // "vertical" = upright bars; "horizontal" = bars run left→right
  height = 260,
  color = ACCENT,
  multicolor = false,
}: {
  data: Record<string, unknown>[];
  categoryKey: string;
  valueKey: string;
  layout?: "vertical" | "horizontal";
  height?: number;
  color?: string;
  multicolor?: boolean;
}) {
  const horizontal = layout === "horizontal";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RBarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 8, right: 16, left: horizontal ? 8 : -8, bottom: 0 }}
      >
        <CartesianGrid stroke={LINE} vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={{ stroke: LINE }} />
            <YAxis
              type="category"
              dataKey={categoryKey}
              tick={{ fontSize: 11, fill: MUTED }}
              tickLine={false}
              axisLine={false}
              width={130}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={categoryKey}
              tick={{ fontSize: 10, fill: MUTED }}
              tickLine={false}
              axisLine={{ stroke: LINE }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={56}
            />
            <YAxis tick={{ fontSize: 11, fill: MUTED }} tickLine={false} axisLine={false} width={40} />
          </>
        )}
        <Tooltip
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${LINE}` }}
        />
        <Bar dataKey={valueKey} radius={horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]} maxBarSize={46}>
          {data.map((_, i) => (
            <Cell key={i} fill={multicolor ? PALETTE[i % PALETTE.length] : color} />
          ))}
        </Bar>
      </RBarChart>
    </ResponsiveContainer>
  );
}
