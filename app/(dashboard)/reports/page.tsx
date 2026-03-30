import { redirect } from "next/navigation";

import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { getCategoryBreakdown, getMonthlySummary, getTrend } from "@/lib/actions/reports.actions";
import { getSession } from "@/lib/auth/session";
import { getCurrentMonthYear, startOfMonth, endOfMonth } from "@/lib/utils";

export default async function ReportsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const current = getCurrentMonthYear();
  const summary = await getMonthlySummary(session.user.id, current.month, current.year);
  const breakdown = await getCategoryBreakdown(
    session.user.id,
    startOfMonth(current.month, current.year).toISOString().slice(0, 10),
    endOfMonth(current.month, current.year).toISOString().slice(0, 10),
  );
  const trend = await getTrend(session.user.id, 6);

  return (
    <section className="grid gap-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-950">Monthly summary</h2>
          <table className="mt-4 min-w-full text-sm">
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="py-3 font-medium text-slate-600">Month</td>
                <td className="py-3 text-right text-slate-950">{summary.monthLabel}</td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-slate-600">Income</td>
                <td className="py-3 text-right text-emerald-600">{summary.income}</td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-slate-600">Expense</td>
                <td className="py-3 text-right text-slate-950">{summary.expense}</td>
              </tr>
            </tbody>
          </table>
        </article>
        <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-950">Top spending categories</h2>
          <div className="mt-4 grid gap-3">
            {breakdown.slice(0, 5).map((item) => (
              <div key={item.categoryName} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: item.categoryColor }} />
                  <span className="font-medium text-slate-950">{item.categoryName}</span>
                </div>
                <span className="text-sm text-slate-700">{item.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
      <article className="min-w-0 rounded-[28px] border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-slate-950">6-month trend</h2>
        <TrendLineChart data={trend} />
      </article>
    </section>
  );
}
