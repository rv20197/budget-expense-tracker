"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type CategoryDonutChartProps = Readonly<{
  data: Array<{ categoryName: string; categoryColor: string; total: number }>;
}>;

export function CategoryDonutChart({ data }: CategoryDonutChartProps) {
  return (
    <div className="h-64 min-h-64 w-full min-w-0 sm:h-80 sm:min-h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="categoryName"
            innerRadius={60}
            outerRadius={90}
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
