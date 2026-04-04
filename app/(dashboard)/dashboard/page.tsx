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
      <form className="flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:flex-wrap sm:p-5">
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm min-h-[44px]" type="date" name="from" defaultValue={from} />
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm min-h-[44px]" type="date" name="to" defaultValue={to} />
        <button className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white min-h-[44px]" type="submit">
          Apply range
        </button>
      </form>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-sm text-slate-500">Income</p>
          <h2 className="mt-2 text-2xl font-semibold text-emerald-600 sm:text-3xl">₹{summary.income}</h2>
        </article>
        <article className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-sm text-slate-500">Expense</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">₹{summary.expense}</h2>
        </article>
        <article className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-sm text-slate-500">Period</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">{summary.monthLabel}</h2>
        </article>
        <article className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5 lg:col-span-1">
          <p className="text-sm text-slate-500">Net Inhand</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">
            ₹{(Number(summary.income.replace(/[$,]/g, '')) - Number(summary.expense.replace(/[$,]/g, ''))).toFixed(2)}
          </h2>
        </article>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-slate-950 sm:text-lg">Income vs expense</h3>
          <div className="mt-4 w-full overflow-x-auto">
            <SummaryBarChart data={trend} />
          </div>
        </article>
        <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-slate-950 sm:text-lg">Expense by category</h3>
          <div className="mt-4 w-full overflow-x-auto">
            <CategoryDonutChart data={breakdown} />
          </div>
        </article>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-slate-950 sm:text-lg">Recent transactions</h3>
          <div className="mt-4 grid gap-3">
            {summary.recentTransactions.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl bg-slate-50 p-3 sm:p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-950 truncate">{item.description}</p>
                  <p className="text-sm text-slate-600 hidden sm:block">{item.categoryName} • {item.transactionDate}</p>
                  <p className="text-sm text-slate-600 sm:hidden">{item.transactionDate}</p>
                </div>
                <span className="font-semibold text-slate-950 ml-2">₹{item.amount}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-slate-950 sm:text-lg">Budget progress</h3>
          <div className="mt-4 grid gap-3">
            {summary.budgetRows.map((item) => (
              <div key={item.categoryName} className="rounded-2xl bg-slate-50 p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-slate-950 truncate text-sm sm:text-base">{item.categoryName}</p>
                  <span className="text-xs sm:text-sm text-slate-600 whitespace-nowrap ml-2">₹{item.spentAmount} / ₹{item.budgetAmount}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-200">
                  <div className="h-3 rounded-full bg-slate-950" style={{ width: `${Math.min((Number(item.spentAmount) / Math.max(Number(item.budgetAmount), 1)) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
      <section className="grid gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950 sm:text-lg">Debt Overview</h3>
          <p className="mt-1 text-sm text-slate-600">
            Active borrowing and lending positions at a glance.
          </p>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/debt"
            className="rounded-[28px] border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:p-5 min-h-[44px] flex flex-col justify-center"
          >
            <p className="text-sm text-slate-500">Total I Owe</p>
            <h4 className="mt-2 text-xl font-semibold text-slate-950 sm:text-2xl">
              ₹{debtSummary.totalDebt}
            </h4>
          </Link>
          <Link
            href="/debt"
            className="rounded-[28px] border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:p-5 min-h-[44px] flex flex-col justify-center"
          >
            <p className="text-sm text-slate-500">Total Owed to Me</p>
            <h4 className="mt-2 text-xl font-semibold text-slate-950 sm:text-2xl">
              ₹{debtSummary.totalLoan}
            </h4>
          </Link>
          <Link
            href="/debt"
            className="rounded-[28px] border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:p-5 min-h-[44px] flex flex-col justify-center"
          >
            <p className="text-sm text-slate-500">Overdue Payments</p>
            <h4 className="mt-2 text-xl font-semibold text-red-600 sm:text-2xl">
              ₹{debtSummary.overdueCount}
            </h4>
          </Link>
        </div>
      </section>
    </section>
  );
}
