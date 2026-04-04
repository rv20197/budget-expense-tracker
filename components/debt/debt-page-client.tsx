"use client";

import { useMemo, useState } from "react";

import { CreateDebtModal } from "@/components/debt/create-debt-modal";
import { DebtCard } from "@/components/debt/debt-card";
import { DebtSummaryStrip } from "@/components/debt/debt-summary-strip";
import { EditDebtModal } from "@/components/debt/edit-debt-modal";
import { Button } from "@/components/ui/button";

type DebtItem = {
  id: string;
  name: string;
  direction: "DEBT" | "LOAN";
  counterparty: string;
  principal: string;
  remainingBalance: string;
  amountPaid: string;
  interestRate: string;
  interestType: "NONE" | "SIMPLE" | "COMPOUND";
  dueDate: string | null;
  nextPaymentDate: string | null;
  installmentAmount: string | null;
  status: "ACTIVE" | "PAID" | "CANCELLED";
  notes: string | null;
  payments: Array<{
    id: string;
    amount: string;
    paidOn: string;
    note: string | null;
  }>;
};

type DebtPageClientProps = Readonly<{
  debts: DebtItem[];
  loans: DebtItem[];
  summary: {
    totalDebt: string;
    totalLoan: string;
    overdueCount: number;
    dueSoonCount: number;
  };
  projections: Record<
    string,
    {
      months: number;
      projectedPayoffDate: string;
    } | null
  >;
}>;

export function DebtPageClient({
  debts,
  loans,
  summary,
  projections,
}: DebtPageClientProps) {
  const [tab, setTab] = useState<"DEBT" | "LOAN">("DEBT");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("dueDate");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);

  const activeList = tab === "DEBT" ? debts : loans;
  const filteredItems = useMemo(() => {
    const byStatus =
      statusFilter === "ALL"
        ? activeList
        : activeList.filter((item) => item.status === statusFilter);

    return [...byStatus].sort((a, b) => {
      if (a.status === "PAID" && b.status !== "PAID") return 1;
      if (a.status !== "PAID" && b.status === "PAID") return -1;
      if (sortBy === "remainingBalance") {
        return Number(b.remainingBalance) - Number(a.remainingBalance);
      }
      if (sortBy === "createdAt") {
        return a.id.localeCompare(b.id);
      }
      return (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31");
    });
  }, [activeList, sortBy, statusFilter]);

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Debt Management</h2>
          <p className="mt-1 text-sm text-slate-600">
            Track money you owe and money owed back to you without deleting history.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto">Add Debt</Button>
      </div>
      <DebtSummaryStrip {...summary} />
      <div className="flex flex-col gap-3 rounded-[28px] border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:p-5">
        <div className="inline-flex rounded-2xl bg-white p-1 w-full sm:w-auto">
          {[
            { label: "My Debts", value: "DEBT" },
            { label: "My Loans", value: "LOAN" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              className={`flex-1 sm:flex-none rounded-2xl px-4 py-2 text-sm font-medium transition ${
                tab === item.value ? "bg-slate-950 text-white" : "text-slate-600"
              }`}
              onClick={() => setTab(item.value as "DEBT" | "LOAN")}
            >
              {item.label}
            </button>
          ))}
        </div>
        <select
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none min-h-[44px] sm:w-auto"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PAID">Paid</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none min-h-[44px] sm:w-auto"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
        >
          <option value="dueDate">Due Date</option>
          <option value="remainingBalance">Remaining Balance</option>
          <option value="createdAt">Created Date</option>
        </select>
      </div>
      {filteredItems.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8 sm:p-12 text-center">
          <h3 className="text-lg sm:text-xl font-semibold text-slate-950">No debts yet</h3>
          <p className="mt-2 text-sm text-slate-600">
            Add your first debt to start tracking balances and payment history.
          </p>
          <Button className="mt-5 w-full sm:w-auto" onClick={() => setIsCreateOpen(true)}>
            Add your first debt
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              projection={projections[debt.id] ?? null}
              onEdit={() => setEditingDebt(debt)}
            />
          ))}
        </div>
      )}
      <CreateDebtModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <EditDebtModal
        open={Boolean(editingDebt)}
        debt={editingDebt}
        onClose={() => setEditingDebt(null)}
      />
    </section>
  );
}
