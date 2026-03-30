"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type CategoryDonutChartProps = Readonly<{
  data: Array<{ categoryName: string; categoryColor: string; total: number }>;
}>;

export function CategoryDonutChart({ data }: CategoryDonutChartProps) {
  return (
    <div className="h-80 min-h-80 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="categoryName"
            innerRadius={80}
            outerRadius={110}
            paddingAngle={3}
          >
            {data.map((entry) => (
              <Cell key={entry.categoryName} fill={entry.categoryColor} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
