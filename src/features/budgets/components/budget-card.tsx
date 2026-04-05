import { formatCurrency } from "@/lib/utils";

type BudgetCardProps = Readonly<{
  item: {
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    budgetId: string | null;
    budgetAmount: string;
    spentAmount: string;
    remainingAmount: string;
    progress: number;
    isOverBudget: boolean;
  };
}>;

export function BudgetCard({ item }: BudgetCardProps) {
  const tone =
    item.progress >= 100
      ? "bg-red-500"
      : item.progress >= 75
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <span
          className="inline-block h-4 w-4 rounded-full"
          style={{ backgroundColor: item.categoryColor }}
        />
        <h3 className="font-semibold text-slate-950">{item.categoryName}</h3>
      </div>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
            Budget
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">
            {formatCurrency(item.budgetAmount)}
          </p>
        </div>
        <div className="text-right text-sm text-slate-600">
          <p>Spent: {formatCurrency(item.spentAmount)}</p>
          <p>Remaining: {formatCurrency(item.remainingAmount)}</p>
        </div>
      </div>
      <div className="mt-4 h-3 rounded-full bg-slate-100">
        <div
          className={`h-3 rounded-full ${tone}`}
          style={{ width: `${Math.min(item.progress, 100)}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-slate-600">
        {item.progress.toFixed(0)}% of budget used
      </p>
    </article>
  );
}
