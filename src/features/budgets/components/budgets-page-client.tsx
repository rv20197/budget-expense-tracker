"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  copyBudgetsToNextMonth,
  deleteBudget,
  upsertBudget,
} from "@/features/budgets/actions/budgets.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BudgetCard } from "@/features/budgets/components/budget-card";
import { OverBudgetBanner } from "@/features/budgets/components/over-budget-banner";
import { Label } from "recharts";

type VisibleCategory = {
  id: string;
  name: string;
  scope: "household" | "personal";
};

type BudgetItem = {
  budgetId: string | null;
  budgetAmount: string;
  categoryColor: string;
  categoryId: string;
  categoryName: string;
  createdBy: string;
  isOverBudget: boolean;
  progress: number;
  remainingAmount: string;
  scope: "household" | "personal";
  spentAmount: string;
};

type BudgetsPageClientProps = Readonly<{
  month: number;
  year: number;
  categories: VisibleCategory[];
  items: BudgetItem[];
}>;

export function BudgetsPageClient({
  month,
  year,
  categories,
  items,
}: BudgetsPageClientProps) {
  const [isPending, startTransition] = useTransition();
  const [scope, setScope] = useState<"household" | "personal">("household");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const overBudgetCount = items.filter((item) => item.isOverBudget).length;
  const activeCategory = categories.find((item) => item.id === categoryId) ?? null;

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Budgets</h2>
          <p className="mt-1 text-sm text-slate-600">
            Shared budgets help the whole household stay aligned, while personal budgets stay private.
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
          className="w-full sm:w-auto"
        >
          {isPending ? "Copying..." : "Copy to next month"}
        </Button>
      </div>

      <OverBudgetBanner count={overBudgetCount} />

      <form
        className="rounded-[28px] border border-slate-200 bg-slate-50 p-4 sm:p-5"
        action={async (formData) => {
          const selectedCategoryId = String(formData.get("categoryId") ?? "");
          const selectedScope = String(formData.get("scope") ?? "household") as
            | "household"
            | "personal";
          const amount = String(formData.get("amount") ?? "");

          const result = await upsertBudget(
            {
              amount,
              categoryId: selectedCategoryId,
              month,
              year,
            },
            selectedScope,
          );

          if (!result.success) {
            toast.error(result.error);
            return;
          }

          toast.success("Budget saved.");
        }}
      >
        <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-500">
          Create budget
        </h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_0.8fr_auto]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              Category
            </label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none"
              name="categoryId"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-900">Scope</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                <input
                  checked={scope === "household"}
                  className="mt-1"
                  name="scope"
                  onChange={() => setScope("household")}
                  type="radio"
                  value="household"
                />
                <span>
                  <span className="block font-medium text-slate-950">
                    Shared with family
                  </span>
                  <span className="text-slate-600">
                    Household-wide spending target.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
                <input
                  checked={scope === "personal"}
                  className="mt-1"
                  name="scope"
                  onChange={() => setScope("personal")}
                  type="radio"
                  value="personal"
                />
                <span>
                  <span className="block font-medium text-slate-950">
                    Personal
                  </span>
                  <span className="text-slate-600">
                    Visible only to you.
                  </span>
                </span>
              </label>
            </div>
            {activeCategory?.scope === "personal" ? (
              <p className="mt-2 text-xs text-slate-500">
                This category is already personal, so only you will see it in budget forms.
              </p>
            ) : null}
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-900">
              Amount
            </label>
            <Input name="amount" placeholder="0.00" />
          </div>
          <div className="flex items-end">
            <Button className="w-full lg:w-auto" type="submit">
              Save budget
            </Button>
          </div>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.budgetId ?? `${item.categoryId}-${item.scope}`}>
            <BudgetCard item={item} />
            {item.budgetId ? (
              <Button
                className="mt-3 w-full"
                type="button"
                variant="ghost"
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteBudget(item.budgetId!);

                    if (!result.success) {
                      toast.error(result.error);
                      return;
                    }

                    toast.success("Budget deleted.");
                  })
                }
              >
                Clear budget
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
