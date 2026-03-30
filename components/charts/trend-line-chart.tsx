"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TrendLineChartProps = Readonly<{
  data: Array<{ label: string; income: number; expense: number }>;
}>;

export function TrendLineChart({ data }: TrendLineChartProps) {
  return (
    <div className="h-80 min-h-80 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="income"
            stroke="#16a34a"
            strokeWidth={3}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="expense"
            stroke="#0f172a"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
