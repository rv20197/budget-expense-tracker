"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  month: string; // YYYY-MM
};

export function InsightsCard({ month }: Props) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(
    async (bust: boolean) => {
      setLoading(true);
      setFailed(false);
      try {
        const url = `/api/ai/insights?month=${month}${bust ? "&bust=true" : ""}`;
        const res = await fetch(url);
        if (!res.ok) { setFailed(true); return; }
        const data = (await res.json()) as { insight: string | null };
        if (data.insight) {
          setInsight(data.insight);
        } else {
          setFailed(true);
        }
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [month],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-slate-950 sm:text-lg">
          AI Insights
        </h3>
        <button
          type="button"
          disabled={loading}
          onClick={() => load(true)}
          className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2.5">
          <div className="h-3.5 w-full animate-pulse rounded-full bg-slate-100" />
          <div className="h-3.5 w-5/6 animate-pulse rounded-full bg-slate-100" />
          <div className="h-3.5 w-4/6 animate-pulse rounded-full bg-slate-100" />
        </div>
      ) : failed || !insight ? (
        <p className="text-sm text-slate-400">
          Unable to generate insights right now. Try refreshing.
        </p>
      ) : (
        <p className="text-sm text-slate-600 leading-relaxed">{insight}</p>
      )}
    </article>
  );
}
