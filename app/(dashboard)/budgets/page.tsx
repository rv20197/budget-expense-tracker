import { BudgetsPageClient } from "@/components/budgets/budgets-page-client";
import { getBudgets } from "@/lib/actions/budgets.actions";
import { getCategories } from "@/lib/actions/categories.actions";
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
      <form className="flex flex-wrap gap-3 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
        <input
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          type="number"
          min={1}
          max={12}
          name="month"
          defaultValue={month}
        />
        <input
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          type="number"
          min={2020}
          max={2100}
          name="year"
          defaultValue={year}
        />
        <button
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white"
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
        }))}
        items={items}
      />
    </section>
  );
}
