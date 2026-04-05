"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { deletePayment } from "@/features/debts/actions/debt.actions";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type PaymentHistoryTableProps = Readonly<{
  payments: Array<{
    id: string;
    amount: string;
    paidOn: string;
    note: string | null;
  }>;
  amountPaid: string;
}>;

export function PaymentHistoryTable({
  payments,
  amountPaid,
}: PaymentHistoryTableProps) {
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (payments.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
        No payments recorded yet.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="px-4 py-3">{payment.paidOn}</td>
                <td className="px-4 py-3 font-medium text-slate-950">
                  {formatCurrency(payment.amount)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {payment.note || "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedPaymentId(payment.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-semibold text-slate-950">
              <td className="px-4 py-3">Total paid</td>
              <td className="px-4 py-3">{formatCurrency(amountPaid)}</td>
              <td className="px-4 py-3" colSpan={2} />
            </tr>
          </tbody>
        </table>
      </div>
      <Modal
        open={Boolean(selectedPaymentId)}
        onClose={() => setSelectedPaymentId(null)}
        title="Delete payment?"
        description="This will recalculate the remaining balance for the debt."
      >
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setSelectedPaymentId(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                if (!selectedPaymentId) {
                  return;
                }

                const result = await deletePayment(selectedPaymentId);

                if (!result.success) {
                  toast.error(result.error);
                  return;
                }

                toast.success("Payment deleted.");
                setSelectedPaymentId(null);
              })
            }
          >
            {isPending ? "Deleting..." : "Delete payment"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
