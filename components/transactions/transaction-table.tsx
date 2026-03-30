"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteTransaction } from "@/lib/actions/transactions.actions";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type TransactionItem = {
  id: string;
  description: string;
  amount: string;
  type: "income" | "expense";
  transactionDate: string;
  notes: string | null;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
};

type TransactionTableProps = Readonly<{
  items: TransactionItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onEdit: (transaction: TransactionItem) => void;
}>;

export function TransactionTable({
  items,
  selectedIds,
  onSelectionChange,
  onEdit,
}: TransactionTableProps) {
  const [transactionToDelete, setTransactionToDelete] =
    useState<TransactionItem | null>(null);
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-600">
        No transactions match these filters yet.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-[28px] border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.length === items.length}
                  onChange={(event) =>
                    onSelectionChange(
                      event.target.checked ? items.map((item) => item.id) : [],
                    )
                  }
                />
              </th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {items.map((item) => {
              const isSelected = selectedIds.includes(item.id);

              return (
                <tr key={item.id}>
                  <td className="px-4 py-4 align-top">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(event) =>
                        onSelectionChange(
                          event.target.checked
                            ? [...selectedIds, item.id]
                            : selectedIds.filter((id) => id !== item.id),
                        )
                      }
                    />
                  </td>
                  <td className="px-4 py-4 align-top">
                    <p className="font-medium text-slate-900">
                      {item.description}
                    </p>
                    {item.notes ? (
                      <p className="mt-1 text-xs text-slate-500">{item.notes}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <Badge
                      className="border border-white/40"
                      variant={item.type === "income" ? "success" : "neutral"}
                    >
                      <span
                        className="mr-2 inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: item.categoryColor }}
                      />
                      {item.categoryName}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 align-top text-slate-600">
                    {item.transactionDate}
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span
                      className={
                        item.type === "income"
                          ? "font-semibold text-emerald-600"
                          : "font-semibold text-slate-900"
                      }
                    >
                      {item.type === "income" ? "+" : "-"}
                      {formatCurrency(item.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => onEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setTransactionToDelete(item)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Modal
        open={Boolean(transactionToDelete)}
        onClose={() => setTransactionToDelete(null)}
        title="Delete transaction?"
        description="This action cannot be undone."
      >
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setTransactionToDelete(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                if (!transactionToDelete) {
                  return;
                }

                const result = await deleteTransaction(transactionToDelete.id);

                if (!result.success) {
                  toast.error(result.error);
                  return;
                }

                toast.success("Transaction deleted.");
                setTransactionToDelete(null);
              })
            }
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
