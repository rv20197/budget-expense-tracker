"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SummaryBarChartProps = Readonly<{
  data: Array<{ label: string; income: number; expense: number }>;
}>;

export function SummaryBarChart({ data }: SummaryBarChartProps) {
  return (
    <div className="h-80 min-h-80 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} />
          <Tooltip />
          <Bar dataKey="income" fill="#16a34a" radius={[10, 10, 0, 0]} />
          <Bar dataKey="expense" fill="#0f172a" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
