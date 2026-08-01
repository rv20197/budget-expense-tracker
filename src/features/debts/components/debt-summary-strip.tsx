"use client";

import { useCurrency } from "@/lib/currencyContext";
import { formatCurrency, formatCurrencyDetailed } from "@/lib/utils";

type DebtSummaryStripProps = Readonly<{
  totalDebt: string;
  totalLoan: string;
  overdueCount: number;
  dueSoonCount: number;
  currency?: string;
}>;

export function DebtSummaryStrip({
  totalDebt,
  totalLoan,
  overdueCount,
  dueSoonCount,
  currency: currencyProp,
}: DebtSummaryStripProps) {
  const { currency: contextCurrency } = useCurrency();
  const currency = currencyProp || contextCurrency;

  const cards = [
    {
      label: "Total I Owe",
      value: formatCurrency(totalDebt, currency),
      detailed: formatCurrencyDetailed(totalDebt, currency),
    },
    {
      label: "Total Owed to Me",
      value: formatCurrency(totalLoan, currency),
      detailed: formatCurrencyDetailed(totalLoan, currency),
    },
    {
      label: "Overdue Payments",
      value: String(overdueCount),
      tone: overdueCount > 0 ? "text-red-600" : "text-slate-950",
    },
    {
      label: "Due in 7 Days",
      value: String(dueSoonCount),
      tone: dueSoonCount > 0 ? "text-amber-600" : "text-slate-950",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5"
        >
          <p className="text-xs sm:text-sm text-slate-500">{card.label}</p>
          <h2
            className={`mt-2 text-lg sm:text-xl lg:text-2xl font-semibold truncate ${card.tone ?? "text-slate-950"}`}
            title={card.detailed ?? card.value}
          >
            {card.value}
          </h2>
        </article>
      ))}
    </div>
  );
}
