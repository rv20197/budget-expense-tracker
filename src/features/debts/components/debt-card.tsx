"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import HistoryIcon from "@mui/icons-material/History";

import { cancelDebt } from "@/features/debts/actions/debt.actions";
import { useCurrency } from "@/lib/currencyContext";
import { formatCurrency, formatCurrencyDetailed } from "@/lib/utils";
import { PaymentHistoryPanel } from "@/features/debts/components/payment-history-panel";
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
  };
  projection: {
    months: number;
    projectedPayoffDate: string;
  } | null;
  onEdit: () => void;
  currency?: string;
}>;

export function DebtCard({ debt, projection, onEdit, currency: currencyProp }: DebtCardProps) {
  const router = useRouter();
  const { currency: contextCurrency } = useCurrency();
  const currency = currencyProp || contextCurrency;

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
  const isOverdue = dueDate ? dueDate <= today && debt.status === "ACTIVE" : false;
  const isDueSoon = dueDate
    ? dueDate > today &&
      debt.status === "ACTIVE" &&
      new Date(dueDate) <= dueSoonThreshold
    : false;

  return (
    <>
      <article className="rounded-[28px] border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={debt.direction === "DEBT" ? "danger" : "success"}>
                {debt.direction === "DEBT" ? "I Owe" : "Owed to Me"}
              </Badge>
              {isOverdue ? <Badge variant="danger">Overdue</Badge> : null}
              {isDueSoon ? <Badge variant="warning">Due soon</Badge> : null}
              {debt.status === "PAID" ? <Badge variant="success">Paid off</Badge> : null}
              {debt.status === "CANCELLED" ? <Badge variant="neutral">Cancelled</Badge> : null}
            </div>
            <h3 className="mt-2 text-lg font-semibold text-slate-950">{debt.name}</h3>
            <p className="text-sm text-slate-500">
              {debt.direction === "DEBT" ? `Pay to ${debt.counterparty}` : `From ${debt.counterparty}`} • Added by {debt.addedByName}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {debt.status === "ACTIVE" ? (
              <>
                <Button onClick={() => setShowPaymentModal(true)} className="w-full sm:w-auto">Record payment</Button>
                <Button variant="secondary" onClick={onEdit} className="w-full sm:w-auto">Edit</Button>
              </>
            ) : null}
            <Button
              variant={showHistory ? "primary" : "secondary"}
              onClick={() => setShowHistory((prev) => !prev)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5"
            >
              <HistoryIcon className="h-4 w-4" />
              {showHistory ? "Hide History" : "Payment History"}
            </Button>
            {debt.status === "ACTIVE" ? (
              <Button variant="ghost" onClick={() => setShowCancelModal(true)} className="w-full sm:w-auto">Cancel position</Button>
            ) : null}
          </div>
        </div>
        {debt.status === "CANCELLED" ? (
          <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-xs font-medium text-amber-800 border border-amber-200/60">
            Cancelled
          </div>
        ) : null}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs sm:text-sm text-slate-500">Remaining balance</p>
            <p className="mt-1 text-xl sm:text-2xl font-semibold text-slate-950 truncate" title={formatCurrencyDetailed(debt.remainingBalance, currency)}>
              {formatCurrency(debt.remainingBalance, currency)}
            </p>
          </div>
          <div>
            <p className="text-xs sm:text-sm text-slate-500">Principal</p>
            <p className="mt-1 font-semibold text-slate-950 truncate" title={formatCurrencyDetailed(debt.principal, currency)}>
              {formatCurrency(debt.principal, currency)}
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
              {debt.installmentAmount ? ` • ${formatCurrency(debt.installmentAmount, currency)}` : ""}
            </p>
          </div>
        </div>
        <div className="mt-5 h-3 rounded-full bg-slate-100">
          <div
            className="h-3 rounded-full bg-emerald-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-slate-600">
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <span>
              Paid {formatCurrency(debt.amountPaid, currency)} of {formatCurrency(debt.principal, currency)}
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
          <button
            type="button"
            onClick={() => setShowHistory((prev) => !prev)}
            className="font-medium text-slate-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <HistoryIcon className="h-4 w-4 text-slate-500" />
            {showHistory ? "Hide History" : "View History"}
          </button>
        </div>
        {showHistory ? (
          <div className="mt-5 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm text-slate-950 flex items-center gap-2">
                <HistoryIcon className="h-4 w-4 text-slate-600" />
                Payment History for {debt.name}
              </h4>
            </div>
            <PaymentHistoryPanel
              debtId={debt.id}
              amountPaid={debt.amountPaid}
              onPaymentDeleted={() => router.refresh()}
            />
          </div>
        ) : null}
      </article>
      <RecordPaymentModal
        open={showPaymentModal}
        debtId={debt.id}
        debtName={debt.name}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          setShowHistory(true);
          router.refresh();
        }}
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
