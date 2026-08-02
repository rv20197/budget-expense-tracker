"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useCurrency } from "@/lib/currencyContext";
import { formatCurrency, formatCurrencyDetailed } from "@/lib/utils";

type CategoryDonutChartProps = Readonly<{
  data: Array<{ categoryName: string; categoryColor: string; total: number }>;
  currency?: string;
  selectedCategory?: string | null;
  onSelectCategory?: (categoryName: string | null) => void;
}>;

function CustomTooltip({ active, payload, currency }: any) {
  if (active && payload && payload.length) {
    const data = payload[0];
    const categoryName = data.name || data.payload?.categoryName || "Category";
    const color = data.payload?.categoryColor || data.fill || "#0f172a";
    return (
      <div className="rounded-2xl border border-slate-100 bg-white/95 p-3.5 shadow-xl backdrop-blur-md text-xs min-w-40">
        <div className="flex items-center gap-2 mb-1.5 border-b border-slate-100 pb-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="font-semibold text-slate-800">{categoryName}</span>
        </div>
        <p className="font-bold text-slate-900 text-sm">
          {formatCurrencyDetailed(Number(data.value || 0), currency)}
        </p>
      </div>
    );
  }
  return null;
}

export function CategoryDonutChart({
  data,
  currency: currencyProp,
  selectedCategory,
  onSelectCategory,
}: CategoryDonutChartProps) {
  const { currency: contextCurrency } = useCurrency();
  const currency = currencyProp || contextCurrency;

  const handlePieClick = (entry: any) => {
    const categoryName = entry?.categoryName || entry?.name || entry?.payload?.categoryName;
    if (categoryName && onSelectCategory) {
      onSelectCategory(selectedCategory === categoryName ? null : categoryName);
    }
  };

  const isAnySelected = Boolean(selectedCategory);

  return (
    <div className="flex flex-col gap-4">
      <div className="h-64 min-h-64 w-full min-w-0 sm:h-80 sm:min-h-80">
        <ResponsiveContainer width="100%" height="100%" minWidth={1}>
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="categoryName"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              onClick={handlePieClick}
              className="cursor-pointer"
            >
              {data.map((entry) => {
                const isSelected = selectedCategory === entry.categoryName;
                return (
                  <Cell
                    key={entry.categoryName}
                    fill={entry.categoryColor}
                    fillOpacity={isAnySelected ? (isSelected ? 1 : 0.35) : 1}
                    stroke={isSelected ? "#0f172a" : "#ffffff"}
                    strokeWidth={isSelected ? 3 : 1}
                    className="cursor-pointer transition-all duration-200 hover:opacity-90"
                    onClick={(e: any) => {
                      e?.stopPropagation?.();
                      if (onSelectCategory) {
                        onSelectCategory(isSelected ? null : entry.categoryName);
                      }
                    }}
                  />
                );
              })}
            </Pie>
            <Tooltip content={<CustomTooltip currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {data.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-100">
          {data.map((item) => {
            const isSelected = selectedCategory === item.categoryName;
            return (
              <button
                key={item.categoryName}
                type="button"
                onClick={() =>
                  onSelectCategory?.(isSelected ? null : item.categoryName)
                }
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition cursor-pointer ${isSelected
                    ? "bg-slate-900 text-white shadow-xs ring-2 ring-slate-900 ring-offset-1"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.categoryColor }}
                />
                <span>{item.categoryName}</span>
                <span className={isSelected ? "text-slate-300" : "text-slate-500"}>
                  ({formatCurrency(item.total, currency)})
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
