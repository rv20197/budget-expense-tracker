"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useCurrency } from "@/lib/currencyContext";
import { formatCurrency, formatCurrencyDetailed } from "@/lib/utils";

type CategoryDonutChartProps = Readonly<{
  data: Array<{ categoryName: string; categoryColor: string; total: number }>;
  currency?: string;
}>;

export function CategoryDonutChart({ data, currency: currencyProp }: CategoryDonutChartProps) {
  const { currency: contextCurrency } = useCurrency();
  const currency = currencyProp || contextCurrency;

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
          <Tooltip formatter={(value: any, name: any) => [formatCurrencyDetailed(Number(value || 0), currency), name || "Category"]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
