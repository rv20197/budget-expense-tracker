"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  deletePayment,
  getPaymentHistory,
  type PaymentHistoryPage,
} from "@/features/debts/actions/debt.actions";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type PaymentHistoryPanelProps = Readonly<{
  debtId: string;
  amountPaid: string;
}>;

export function PaymentHistoryPanel({
  debtId,
  amountPaid,
}: PaymentHistoryPanelProps) {
  const [page, setPage] = useState<PaymentHistoryPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadPage = useCallback(
    async (pageNumber: number) => {
      setIsLoading(true);
      const result = await getPaymentHistory(debtId, pageNumber);
      setPage(result);
      setCurrentPage(pageNumber);
      setIsLoading(false);
    },
    [debtId],
  );

  useEffect(() => {
    void loadPage(1);
  }, [loadPage]);

  if (isLoading && !page) {
    return (
      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
        Loading payment history…
      </div>
    );
  }

  if (!page || page.items.length === 0) {
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
            {page.items.map((payment) => (
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

      {page.totalPages > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {currentPage} of {page.totalPages} ({page.total} payments)
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => void loadPage(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              disabled={currentPage >= page.totalPages || isLoading}
              onClick={() => void loadPage(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

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
                // Reload current page; if it's now empty, go back one page.
                const reloadPage =
                  page.items.length === 1 && currentPage > 1
                    ? currentPage - 1
                    : currentPage;
                void loadPage(reloadPage);
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
