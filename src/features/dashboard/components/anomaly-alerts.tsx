"use client";

import { useEffect, useState } from "react";

import type { AnomalyAlert } from "@/app/api/ai/anomalies/route";

const severityStyles: Record<AnomalyAlert["severity"], string> = {
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  critical: "border-red-200 bg-red-50 text-red-900",
};

const typeLabels: Record<AnomalyAlert["type"], string> = {
  overspend: "Overspending",
  unusual_transaction: "Unusual Transaction",
  budget_exceeded: "Budget Exceeded",
};

export function AnomalyAlerts() {
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/ai/anomalies");
        if (!res.ok) return;
        const data = (await res.json()) as { alerts?: AnomalyAlert[] };
        if (data.alerts && data.alerts.length > 0) {
          setAlerts(data.alerts);
        }
      } catch {
        // silently fail — never block the dashboard
      }
    })();
  }, []);

  const visibleAlerts = alerts.filter(
    (a) => !dismissedKeys.has(`${a.type}:${a.category}`),
  );

  if (visibleAlerts.length === 0) return null;

  const dismiss = (alert: AnomalyAlert) => {
    setDismissedKeys((prev) => new Set([...prev, `${alert.type}:${alert.category}`]));
  };

  return (
    <div className="flex flex-col gap-2">
      {visibleAlerts.map((alert) => (
        <div
          key={`${alert.type}:${alert.category}`}
          className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${severityStyles[alert.severity]}`}
        >
          <div className="min-w-0">
            <span className="font-semibold">{typeLabels[alert.type]}</span>
            {" · "}
            <span className="font-medium">{alert.category}</span>
            <p className="mt-0.5 opacity-80">{alert.message}</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss alert"
            onClick={() => dismiss(alert)}
            className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-current"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
