"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import {
  copyBudgetsToNextMonth,
  deleteBudget,
  upsertBudget,
} from "@/lib/actions/budgets.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BudgetCard } from "@/components/budgets/budget-card";
import { OverBudgetBanner } from "@/components/budgets/over-budget-banner";

type BudgetsPageClientProps = Readonly<{
  month: number;
  year: number;
  categories: Array<{ id: string; name: string }>;
  items: Array<{
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    budgetId: string | null;
    budgetAmount: string;
    spentAmount: string;
    remainingAmount: string;
    progress: number;
    isOverBudget: boolean;
  }>;
}>;

export function BudgetsPageClient({
  month,
  year,
  categories,
  items,
}: BudgetsPageClientProps) {
  const [isPending, startTransition] = useTransition();
  const overBudgetCount = items.filter((item) => item.isOverBudget).length;

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Budgets</h2>
          <p className="mt-1 text-sm text-slate-600">
            Set category limits and keep an eye on pressure points.
          </p>
        </div>
        <Button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await copyBudgetsToNextMonth(month, year);

              if (!result.success) {
                toast.error(result.error);
                return;
              }

              toast.success(`Copied ${result.data.count} budgets forward.`);
            })
          }
        >
          {isPending ? "Copying..." : "Copy to next month"}
        </Button>
      </div>
      <OverBudgetBanner count={overBudgetCount} />
      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
          Set budgets
        </h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {categories.map((category) => {
            const current = items.find((item) => item.categoryId === category.id);

            return (
              <form
                key={category.id}
                className="flex items-end gap-3 rounded-2xl bg-white p-4"
                action={async (formData) => {
                  const amount = formData.get("amount");

                  const result = await upsertBudget({
                    categoryId: category.id,
                    month,
                    year,
                    amount: String(amount ?? ""),
                  });

                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }

                  toast.success(`${category.name} budget saved.`);
                }}
              >
                <input type="hidden" name="categoryId" value={category.id} />
                <div className="flex-1">
                  <p className="mb-2 text-sm font-medium text-slate-900">
                    {category.name}
                  </p>
                  <Input
                    name="amount"
                    defaultValue={current?.budgetAmount ?? ""}
                    placeholder="0.00"
                  />
                </div>
                <Button type="submit">Save</Button>
                {current?.budgetId ? (
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        const result = await deleteBudget(current.budgetId!);

                        if (!result.success) {
                          toast.error(result.error);
                          return;
                        }

                        toast.success(`${category.name} budget deleted.`);
                      })
                    }
                  >
                    Clear
                  </Button>
                ) : null}
              </form>
            );
          })}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <BudgetCard key={item.categoryId} item={item} />
        ))}
      </div>
    </section>
  );
}
