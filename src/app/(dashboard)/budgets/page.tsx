import { BudgetsPageClient } from "@/features/budgets/components/budgets-page-client";
import { getBudgets } from "@/features/budgets/actions/budgets.actions";
import { getCategories } from "@/features/categories/actions/categories.actions";
import { getCurrentMonthYear } from "@/lib/utils";

type BudgetsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BudgetsPage({ searchParams }: BudgetsPageProps) {
  const params = (await searchParams) ?? {};
  const current = getCurrentMonthYear();
  const month = Number(params.month ?? current.month);
  const year = Number(params.year ?? current.year);
  const [items, categories] = await Promise.all([
    getBudgets(month, year),
    getCategories("expense"),
  ]);

  return (
    <section className="grid gap-6">
      <div>
        <h1 className="text-xl font-bold text-slate-950 sm:text-2xl">Budgets</h1>
        <p className="text-sm text-slate-600">Set and track spending limits for different categories</p>
      </div>
      <form className="flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:flex-wrap sm:p-5">
        <input
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none min-h-[44px]"
          type="number"
          min={1}
          max={12}
          name="month"
          defaultValue={month}
        />
        <input
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none min-h-[44px]"
          type="number"
          min={2020}
          max={2100}
          name="year"
          defaultValue={year}
        />
        <button
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white min-h-[44px]"
          type="submit"
        >
          View month
        </button>
      </form>
      <BudgetsPageClient
        month={month}
        year={year}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          scope: category.scope,
        }))}
        items={items}
      />
    </section>
  );
}
