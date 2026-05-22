"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { upsertBudget } from "@/features/budgets/actions/budgets.actions";

type Recommendation = {
  categoryId: string;
  category: string;
  currentBudget: number;
  suggestedBudget: number;
  reasoning: string;
};

type Props = {
  month: number;
  year: number;
};

function ChangeChip({ current, suggested }: { current: number; suggested: number }) {
  if (current === 0) {
    return (
      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
        New
      </span>
    );
  }
  const pct = Math.round(((suggested - current) / current) * 100);
  const isIncrease = pct > 0;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        isIncrease
          ? "bg-amber-50 text-amber-700"
          : "bg-emerald-50 text-emerald-700"
      }`}
    >
      {isIncrease ? "+" : ""}
      {pct}%
    </span>
  );
}

export function BudgetRecommendationsPanel({ month, year }: Props) {
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const loadRecommendations = async () => {
    setLoading(true);
    setFailed(false);
    setRecommendations(null);
    setAppliedIds(new Set());
    try {
      const res = await fetch("/api/ai/budget-recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      if (!res.ok) { setFailed(true); return; }
      const data = (await res.json()) as { recommendations: Recommendation[] | null };
      if (data.recommendations) {
        setRecommendations(data.recommendations);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const applyOne = (rec: Recommendation) => {
    startTransition(async () => {
      const result = await upsertBudget(
        {
          categoryId: rec.categoryId,
          amount: rec.suggestedBudget.toFixed(2),
          month,
          year,
        },
        "household",
      );
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setAppliedIds((prev) => new Set([...prev, rec.categoryId]));
      toast.success(`Budget for "${rec.category}" updated.`);
    });
  };

  const applyAll = () => {
    if (!recommendations) return;
    const unapplied = recommendations.filter((r) => !appliedIds.has(r.categoryId));
    if (unapplied.length === 0) return;
    startTransition(async () => {
      const results = await Promise.all(
        unapplied.map((rec) =>
          upsertBudget(
            { categoryId: rec.categoryId, amount: rec.suggestedBudget.toFixed(2), month, year },
            "household",
          ),
        ),
      );
      const successIds: string[] = [];
      for (let i = 0; i < unapplied.length; i++) {
        const result = results[i];
        if (result.success) {
          successIds.push(unapplied[i].categoryId);
        } else {
          toast.error(`"${unapplied[i].category}" failed: ${result.error}`);
        }
      }
      if (successIds.length > 0) {
        setAppliedIds((prev) => {
          const next = new Set(prev);
          for (const id of successIds) next.add(id);
          return next;
        });
        toast.success(
          `Applied ${successIds.length} budget recommendation${successIds.length > 1 ? "s" : ""}.`,
        );
      }
    });
  };

  const allApplied =
    recommendations !== null &&
    recommendations.length > 0 &&
    recommendations.every((r) => appliedIds.has(r.categoryId));

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950 sm:text-lg">
            AI Budget Recommendations
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Suggestions based on your last 3 months of spending.
          </p>
        </div>
        <button
          type="button"
          disabled={loading || isPending}
          onClick={loadRecommendations}
          className="w-full rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {loading ? "Analyzing…" : "Get Recommendations"}
        </button>
      </div>

      {loading && (
        <div className="mt-5 flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>
      )}

      {!loading && failed && (
        <p className="mt-4 text-sm text-slate-400">
          Unable to generate recommendations right now. Please try again.
        </p>
      )}

      {!loading && recommendations !== null && recommendations.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">
          Your budgets already align well with recent spending — no adjustments suggested.
        </p>
      )}

      {!loading && recommendations && recommendations.length > 0 && (
        <>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2 pr-4 text-right">Current</th>
                  <th className="pb-2 pr-4 text-right">Suggested</th>
                  <th className="pb-2 pr-4">Change</th>
                  <th className="pb-2 pr-4">Reasoning</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recommendations.map((rec) => {
                  const applied = appliedIds.has(rec.categoryId);
                  return (
                    <tr key={rec.categoryId} className="align-top">
                      <td className="py-3 pr-4 font-medium text-slate-950">
                        {rec.category}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-slate-700">
                        {rec.currentBudget > 0
                          ? `₹${rec.currentBudget.toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-slate-950 font-medium">
                        ₹{rec.suggestedBudget.toFixed(2)}
                      </td>
                      <td className="py-3 pr-4">
                        <ChangeChip
                          current={rec.currentBudget}
                          suggested={rec.suggestedBudget}
                        />
                      </td>
                      <td className="py-3 pr-4 text-slate-500 max-w-xs">
                        {rec.reasoning}
                      </td>
                      <td className="py-3">
                        {applied ? (
                          <span className="text-xs text-emerald-600 font-medium">
                            Applied
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => applyOne(rec)}
                            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                          >
                            Apply
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!allApplied && (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                disabled={isPending}
                onClick={applyAll}
                className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                Apply All
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
