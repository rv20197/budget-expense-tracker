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
import { useCurrency } from "@/lib/currencyContext";
import { formatCompactCurrency, formatCurrencyDetailed } from "@/lib/utils";

type TrendLineChartProps = Readonly<{
  data: Array<{ label: string; income: number; expense: number }>;
  currency?: string;
}>;

function CustomTooltip({ active, payload, label, currency }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white/95 p-3.5 shadow-xl backdrop-blur-md text-xs min-w-40">
        <p className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-2">
          {label}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any) => {
            const isIncome = entry.dataKey === "income";
            const color = isIncome ? "#10b981" : "#0f172a";
            return (
              <div key={entry.dataKey} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-slate-600 capitalize">{entry.name || entry.dataKey}</span>
                </div>
                <span className="font-semibold text-slate-900">
                  {formatCurrencyDetailed(Number(entry.value || 0), currency)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
}

export function TrendLineChart({ data, currency: currencyProp }: TrendLineChartProps) {
  const { currency: contextCurrency } = useCurrency();
  const currency = currencyProp || contextCurrency;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-end gap-4 text-xs font-medium text-slate-600 px-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs" />
          <span>Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-900 shadow-xs" />
          <span>Expense</span>
        </div>
      </div>

      <div className="h-80 min-h-80 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={1}>
          <LineChart data={data} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
              dy={6}
            />
            <YAxis
              width={75}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#64748b", fontSize: 12, fontWeight: 500 }}
              tickFormatter={(val) => formatCompactCurrency(val, currency)}
            />
            <Tooltip content={<CustomTooltip currency={currency} />} />
            <Line
              type="monotone"
              dataKey="income"
              name="Income"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4, fill: "#10b981", stroke: "#ffffff", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#10b981", stroke: "#ffffff", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              name="Expense"
              stroke="#0f172a"
              strokeWidth={3}
              dot={{ r: 4, fill: "#0f172a", stroke: "#ffffff", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "#0f172a", stroke: "#ffffff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
