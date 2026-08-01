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
import { useCurrency } from "@/lib/currencyContext";
import { formatCurrency, formatCurrencyDetailed } from "@/lib/utils";

type SummaryBarChartProps = Readonly<{
  data: Array<{ label: string; income: number; expense: number }>;
  currency?: string;
}>;

export function SummaryBarChart({ data, currency: currencyProp }: SummaryBarChartProps) {
  const { currency: contextCurrency } = useCurrency();
  const currency = currencyProp || contextCurrency;

  return (
    <div className="h-64 min-h-64 w-full min-w-0 sm:h-80 sm:min-h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} />
          <YAxis tickLine={false} axisLine={false} tickFormatter={(val) => formatCurrency(val, currency)} />
          <Tooltip formatter={(value: any) => [formatCurrencyDetailed(Number(value || 0), currency), "Amount"]} />
          <Bar dataKey="income" fill="#16a34a" radius={[10, 10, 0, 0]} />
          <Bar dataKey="expense" fill="#0f172a" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
