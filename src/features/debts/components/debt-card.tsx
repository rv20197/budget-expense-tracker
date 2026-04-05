"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { cancelDebt } from "@/features/debts/actions/debt.actions";
import { formatCurrency } from "@/lib/utils";
import { PaymentHistoryTable } from "@/features/debts/components/payment-history-table";
import { RecordPaymentModal } from "@/features/debts/components/record-payment-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type DebtCardProps = Readonly<{
  debt: {
    id: string;
    name: string;
    direction: "DEBT" | "LOAN";
    addedByName: string;
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
  projection: {
    months: number;
    projectedPayoffDate: string;
  } | null;
  onEdit: () => void;
}>;

export function DebtCard({ debt, projection, onEdit }: DebtCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const progress =
    (Number(debt.amountPaid) / Math.max(Number(debt.principal), 1)) * 100;
  const today = new Date().toISOString().slice(0, 10);
  const dueSoonThreshold = new Date(today);
  dueSoonThreshold.setDate(dueSoonThreshold.getDate() + 7);
  const dueDate = debt.dueDate;
  const isOverdue = dueDate ? dueDate < today && debt.status === "ACTIVE" : false;
  const isDueSoon = dueDate
    ? dueDate >= today &&
      debt.status === "ACTIVE" &&
      new Date(dueDate) <= dueSoonThreshold
    : false;

  return (
    <>
      <article className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg sm:text-xl font-semibold text-slate-950">{debt.name}</h3>
              <Badge variant={debt.direction === "LOAN" ? "success" : "neutral"}>
                {debt.direction}
              </Badge>
              <Badge
                variant={
                  debt.status === "PAID"
                    ? "success"
                    : debt.status === "CANCELLED"
                      ? "neutral"
                      : "warning"
                }
              >
                {debt.status}
              </Badge>
              {isOverdue ? <Badge variant="danger">Overdue</Badge> : null}
              {isDueSoon ? <Badge variant="warning">Due Soon</Badge> : null}
            </div>
            <p className="mt-2 text-sm text-slate-600">{debt.counterparty}</p>
            <p className="mt-2 text-xs text-slate-500">Added by {debt.addedByName}</p>
            {debt.notes ? (
              <p className="mt-2 text-sm text-slate-500">{debt.notes}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <Button
              onClick={() => setShowPaymentModal(true)}
              disabled={debt.status !== "ACTIVE"}
              className="flex-1 sm:flex-none"
            >
              Record Payment
            </Button>
            <Button variant="secondary" onClick={() => setShowHistory((value) => !value)} className="flex-1 sm:flex-none">
              {showHistory ? "Hide History" : "View History"}
            </Button>
            <Button variant="ghost" onClick={onEdit} className="flex-1 sm:flex-none">
              Edit
            </Button>
            {debt.status === "ACTIVE" ? (
              <Button variant="ghost" onClick={() => setShowCancelModal(true)} className="flex-1 sm:flex-none">
                Cancel Debt
              </Button>
            ) : null}
          </div>
        </div>
        {debt.status === "PAID" ? (
          <div className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700">
            Paid Off
          </div>
        ) : null}
        {debt.status === "CANCELLED" ? (
          <div className="mt-4 rounded-2xl bg-slate-100 p-3 text-sm text-slate-600">
            Cancelled
          </div>
        ) : null}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs sm:text-sm text-slate-500">Remaining balance</p>
            <p className="mt-1 text-xl sm:text-2xl font-semibold text-slate-950">
              {formatCurrency(debt.remainingBalance)}
            </p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-slate-500">Principal</p>
            <p className="mt-1 font-semibold text-slate-950">
              {formatCurrency(debt.principal)}
            </p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-slate-500">Due date</p>
            <p className={`mt-1 font-semibold text-sm ${isOverdue ? "text-red-600" : isDueSoon ? "text-amber-600" : "text-slate-950"}`}>
              {debt.dueDate ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-slate-500">Next payment</p>
            <p className="mt-1 font-semibold text-slate-950 text-sm">
              {debt.nextPaymentDate ?? "—"}
              {debt.installmentAmount ? ` • ${formatCurrency(debt.installmentAmount)}` : ""}
            </p>
          </div>
        </div>
        <div className="mt-5 h-3 rounded-full bg-slate-100">
          <div
            className="h-3 rounded-full bg-emerald-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-slate-600">
          <span>
            Paid {formatCurrency(debt.amountPaid)} of {formatCurrency(debt.principal)}
          </span>
          {debt.interestType !== "NONE" ? (
            <span>
              {debt.interestRate}% {debt.interestType}
            </span>
          ) : null}
          {projection ? (
            <span>
              Estimated payoff: {projection.projectedPayoffDate}
            </span>
          ) : null}
        </div>
        {showHistory ? (
          <div className="mt-5">
            <PaymentHistoryTable
              payments={debt.payments}
              amountPaid={debt.amountPaid}
            />
          </div>
        ) : null}
      </article>
      <RecordPaymentModal
        open={showPaymentModal}
        debtId={debt.id}
        debtName={debt.name}
        onClose={() => setShowPaymentModal(false)}
      />
      <Modal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel debt?"
        description="The record will be kept, but no further payments should be recorded."
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setShowCancelModal(false)} className="w-full sm:w-auto">
            Keep active
          </Button>
          <Button
            variant="danger"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await cancelDebt(debt.id);

                if (!result.success) {
                  toast.error(result.error);
                  return;
                }

                toast.success("Debt cancelled.");
                setShowCancelModal(false);
              })
            }
            className="w-full sm:w-auto"
          >
            {isPending ? "Cancelling..." : "Cancel debt"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
