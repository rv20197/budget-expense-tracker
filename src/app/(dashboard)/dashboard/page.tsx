import Link from "next/link";
import { redirect } from "next/navigation";

import { CategoryDonutChart } from "@/features/dashboard/components/category-donut-chart";
import { SummaryBarChart } from "@/features/dashboard/components/summary-bar-chart";
import { getDebtSummary } from "@/features/debts/actions/debt.actions";
import { getCategoryBreakdown, getMonthlySummary, getTrend } from "@/features/dashboard/actions/reports.actions";
import { getSession } from "@/lib/auth/session";
import {
  endOfMonth,
  formatCurrency,
  formatCurrencyDetailed,
  getCurrentMonthYear,
  startOfMonth,
} from "@/lib/utils";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!session.user.householdId) {
    redirect("/onboarding");
  }

  const currency = session.user.currency;
  const params = (await searchParams) ?? {};
  const current = getCurrentMonthYear();
  const from = typeof params.from === "string" ? params.from : startOfMonth(current.month, current.year).toISOString().slice(0, 10);
  const to = typeof params.to === "string" ? params.to : endOfMonth(current.month, current.year).toISOString().slice(0, 10);
  const dashboardContext = {
    householdId: session.user.householdId,
    userId: session.user.id,
  };

  const [summary, breakdown, trend, debtSummary] = await Promise.all([
    getMonthlySummary(dashboardContext, current.month, current.year),
    getCategoryBreakdown(dashboardContext, from, to),
    getTrend(dashboardContext, 1),
    getDebtSummary(session.user.householdId),
  ]);

  const rawIncome = Number(summary.income.replace(/[^0-9.-]+/g, "")) || 0;
  const rawExpense = Number(summary.expense.replace(/[^0-9.-]+/g, "")) || 0;
  const netInhand = rawIncome - rawExpense;

  return (
    <section className="grid gap-6">
      <form className="flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:p-5">
        <input className="w-full sm:w-auto flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm min-h-[44px] outline-none" type="date" name="from" defaultValue={from} />
        <input className="w-full sm:w-auto flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm min-h-[44px] outline-none" type="date" name="to" defaultValue={to} />
        <button className="w-full sm:w-auto rounded-2xl bg-slate-950 px-6 py-3 text-sm font-medium text-white min-h-[44px] hover:bg-slate-800 transition" type="submit">
          Apply range
        </button>
      </form>
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
        <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-xs sm:text-sm text-slate-500">Income</p>
          <h2 className="mt-2 text-lg font-semibold text-emerald-600 sm:text-2xl lg:text-3xl truncate" title={formatCurrencyDetailed(summary.income, currency)}>
            {formatCurrency(summary.income, currency)}
          </h2>
        </article>
        <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-xs sm:text-sm text-slate-500">Expense</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950 sm:text-2xl lg:text-3xl truncate" title={formatCurrencyDetailed(summary.expense, currency)}>
            {formatCurrency(summary.expense, currency)}
          </h2>
        </article>
        <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-xs sm:text-sm text-slate-500">Period</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950 sm:text-2xl lg:text-3xl truncate" title={summary.monthLabel}>
            {summary.monthLabel}
          </h2>
        </article>
        <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5 lg:col-span-1">
          <p className="text-xs sm:text-sm text-slate-500">Net Inhand</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950 sm:text-2xl lg:text-3xl truncate" title={formatCurrencyDetailed(netInhand, currency)}>
            {formatCurrency(netInhand, currency)}
          </h2>
        </article>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-slate-950 sm:text-lg">Income vs expense</h3>
          <div className="mt-4 w-full overflow-x-auto">
            <SummaryBarChart data={trend} currency={currency} />
          </div>
        </article>
        <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-slate-950 sm:text-lg">Expense by category</h3>
          <div className="mt-4 w-full overflow-x-auto">
            <CategoryDonutChart data={breakdown} currency={currency} />
          </div>
        </article>
      </div>
      <div>
        <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
          <h3 className="text-base font-semibold text-slate-950 sm:text-lg">Recent transactions</h3>
          <div className="mt-4 grid gap-3">
            {summary.recentTransactions.map((item) => (
              <div key={item.id} className="flex min-w-0 items-center justify-between rounded-2xl bg-slate-50 p-3 sm:p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-950 truncate">{item.categoryName}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {item.transactionDate} • {item.description}
                  </p>
                </div>
                <span className="font-semibold text-slate-950 ml-2 shrink-0 whitespace-nowrap text-sm sm:text-base" title={formatCurrencyDetailed(item.amount, currency)}>
                  {formatCurrency(item.amount, currency)}
                </span>
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
            className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:p-5 min-h-[44px] flex flex-col justify-center"
          >
            <p className="text-sm text-slate-500">Total I Owe</p>
            <h4 className="mt-2 text-lg font-semibold text-slate-950 sm:text-xl lg:text-2xl truncate" title={formatCurrencyDetailed(debtSummary.totalDebt, currency)}>
              {formatCurrency(debtSummary.totalDebt, currency)}
            </h4>
          </Link>
          <Link
            href="/debt"
            className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:p-5 min-h-[44px] flex flex-col justify-center"
          >
            <p className="text-sm text-slate-500">Total Owed to Me</p>
            <h4 className="mt-2 text-lg font-semibold text-slate-950 sm:text-xl lg:text-2xl truncate" title={formatCurrencyDetailed(debtSummary.totalLoan, currency)}>
              {formatCurrency(debtSummary.totalLoan, currency)}
            </h4>
          </Link>
          <Link
            href="/debt"
            className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-4 transition hover:border-slate-300 sm:p-5 min-h-[44px] flex flex-col justify-center"
          >
            <p className="text-sm text-slate-500">Overdue Payments</p>
            <h4 className="mt-2 text-lg font-semibold text-red-600 sm:text-xl lg:text-2xl truncate">
              {debtSummary.overdueCount}
            </h4>
          </Link>
        </div>
      </section>
    </section>
  );
}
