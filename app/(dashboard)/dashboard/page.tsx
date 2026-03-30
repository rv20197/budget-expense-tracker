import Link from "next/link";
import { redirect } from "next/navigation";

import { CategoryDonutChart } from "@/components/charts/category-donut-chart";
import { SummaryBarChart } from "@/components/charts/summary-bar-chart";
import { getDebtSummary } from "@/lib/actions/debt.actions";
import { getCategoryBreakdown, getMonthlySummary, getTrend } from "@/lib/actions/reports.actions";
import { getSession } from "@/lib/auth/session";
import { endOfMonth, getCurrentMonthYear, startOfMonth } from "@/lib/utils";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const params = (await searchParams) ?? {};
  const current = getCurrentMonthYear();
  const from = typeof params.from === "string" ? params.from : startOfMonth(current.month, current.year).toISOString().slice(0, 10);
  const to = typeof params.to === "string" ? params.to : endOfMonth(current.month, current.year).toISOString().slice(0, 10);

  const [summary, breakdown, trend, debtSummary] = await Promise.all([
    getMonthlySummary(session.user.id, current.month, current.year),
    getCategoryBreakdown(session.user.id, from, to),
    getTrend(session.user.id, 1),
    getDebtSummary(session.user.id),
  ]);

  return (
    <section className="grid gap-6">
      <form className="flex flex-wrap gap-3 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" name="from" defaultValue={from} />
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" type="date" name="to" defaultValue={to} />
        <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white" type="submit">
          Apply range
        </button>
      </form>
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[28px] border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Income</p>
          <h2 className="mt-2 text-3xl font-semibold text-emerald-600">{summary.income}</h2>
        </article>
        <article className="rounded-[28px] border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Expense</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">{summary.expense}</h2>
        </article>
        <article className="rounded-[28px] border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Period</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">{summary.monthLabel}</h2>
        </article>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-semibold text-slate-950">Income vs expense</h3>
          <SummaryBarChart data={trend} />
        </article>
        <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-semibold text-slate-950">Expense by category</h3>
          <CategoryDonutChart data={breakdown} />
        </article>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-semibold text-slate-950">Recent transactions</h3>
          <div className="mt-4 grid gap-3">
            {summary.recentTransactions.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div>
                  <p className="font-medium text-slate-950">{item.description}</p>
                  <p className="text-sm text-slate-600">{item.categoryName} • {item.transactionDate}</p>
                </div>
                <span className="font-semibold text-slate-950">{item.amount}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-5">
          <h3 className="text-lg font-semibold text-slate-950">Budget progress</h3>
          <div className="mt-4 grid gap-3">
            {summary.budgetRows.map((item) => (
              <div key={item.categoryName} className="rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-950">{item.categoryName}</p>
                  <span className="text-sm text-slate-600">{item.spentAmount} / {item.budgetAmount}</span>
                </div>
                <div className="mt-3 h-3 rounded-full bg-slate-200">
                  <div className="h-3 rounded-full bg-slate-950" style={{ width: `${Math.min((Number(item.spentAmount) / Math.max(Number(item.budgetAmount), 1)) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
      <section className="grid gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">Debt Overview</h3>
          <p className="mt-1 text-sm text-slate-600">
            Active borrowing and lending positions at a glance.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/debt"
            className="rounded-[28px] border border-slate-200 bg-white p-5 transition hover:border-slate-300"
          >
            <p className="text-sm text-slate-500">Total I Owe</p>
            <h4 className="mt-2 text-2xl font-semibold text-slate-950">
              {debtSummary.totalDebt}
            </h4>
          </Link>
          <Link
            href="/debt"
            className="rounded-[28px] border border-slate-200 bg-white p-5 transition hover:border-slate-300"
          >
            <p className="text-sm text-slate-500">Total Owed to Me</p>
            <h4 className="mt-2 text-2xl font-semibold text-slate-950">
              {debtSummary.totalLoan}
            </h4>
          </Link>
          <Link
            href="/debt"
            className="rounded-[28px] border border-slate-200 bg-white p-5 transition hover:border-slate-300"
          >
            <p className="text-sm text-slate-500">Overdue Payments</p>
            <h4 className="mt-2 text-2xl font-semibold text-red-600">
              {debtSummary.overdueCount}
            </h4>
          </Link>
        </div>
      </section>
    </section>
  );
}
