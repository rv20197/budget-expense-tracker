"use client";

import { useState } from "react";
import { CategoryDonutChart } from "@/features/dashboard/components/category-donut-chart";
import { SummaryBarChart } from "@/features/dashboard/components/summary-bar-chart";
import { formatCurrency, formatCurrencyDetailed } from "@/lib/utils";

type TransactionItem = {
  id: string;
  amount: string;
  categoryName: string;
  transactionDate: string;
  type: string;
  description: string;
};

type CategoryBreakdownItem = {
  categoryName: string;
  categoryColor: string;
  total: number;
};

type TrendItem = {
  label: string;
  income: number;
  expense: number;
};

type DashboardInteractiveSectionProps = Readonly<{
  trend: TrendItem[];
  breakdown: CategoryBreakdownItem[];
  recentTransactions: TransactionItem[];
  currency: string;
}>;

export function DashboardInteractiveSection({
  trend,
  breakdown,
  recentTransactions,
  currency,
}: DashboardInteractiveSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredTransactions = selectedCategory
    ? recentTransactions.filter((item) => item.categoryName === selectedCategory)
    : recentTransactions.slice(0, 5);

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-2">
        <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-slate-950 sm:text-lg">
            Income vs expense
          </h3>
          <div className="mt-4 w-full overflow-x-auto">
            <SummaryBarChart data={trend} currency={currency} />
          </div>
        </article>
        <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-950 sm:text-lg">
              Expense by category
            </h3>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="text-xs text-slate-500 hover:text-slate-900 underline transition cursor-pointer"
              >
                Reset selection
              </button>
            )}
          </div>
          <div className="mt-4 w-full overflow-x-auto">
            <CategoryDonutChart
              data={breakdown}
              currency={currency}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>
        </article>
      </div>

      <div>
        <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-slate-950 sm:text-lg">
                Recent transactions
              </h3>
              {selectedCategory && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white shadow-xs">
                  <span>Filtered by: {selectedCategory}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="ml-1 rounded-full hover:text-slate-300 focus:outline-none cursor-pointer"
                    title="Clear filter"
                    aria-label="Clear filter"
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
            {selectedCategory && (
              <button
                type="button"
                onClick={() => setSelectedCategory(null)}
                className="text-xs font-medium text-slate-500 hover:text-slate-950 transition cursor-pointer"
              >
                Show all transactions
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-3">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((item) => (
                <div
                  key={item.id}
                  className="flex min-w-0 items-center justify-between rounded-2xl bg-slate-50 p-3 sm:p-4 transition hover:bg-slate-100/80"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-950 truncate">
                      {item.categoryName}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {item.transactionDate} • {item.description}
                    </p>
                  </div>
                  <span
                    className={`font-semibold ml-2 shrink-0 whitespace-nowrap text-sm sm:text-base ${
                      item.type === "income" ? "text-emerald-600" : "text-slate-950"
                    }`}
                    title={formatCurrencyDetailed(item.amount, currency)}
                  >
                    {item.type === "income" ? "+" : "-"}
                    {formatCurrency(item.amount, currency)}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <p className="text-sm font-medium text-slate-600">
                  No recent transactions found for &quot;{selectedCategory}&quot;.
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  className="mt-3 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Clear category filter
                </button>
              </div>
            )}
          </div>
        </article>
      </div>
    </>
  );
}
