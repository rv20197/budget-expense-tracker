"use client";

import { Fragment, useState, useTransition } from "react";
import {
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { toast } from "sonner";

import { deleteTransaction } from "@/features/transactions/actions/transactions.actions";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type SortableHeaderProps = {
  column: "description" | "categoryName" | "transactionDate" | "amount";
  sortBy?: "description" | "categoryName" | "transactionDate" | "amount";
  sortOrder?: "asc" | "desc";
  onSort: (column: "description" | "categoryName" | "transactionDate" | "amount") => void;
  children: React.ReactNode;
};

function SortableHeader({ column, sortBy, sortOrder, onSort, children }: SortableHeaderProps) {
  const isActive = sortBy === column;
  const Icon = isActive && sortOrder === "asc" ? ArrowUpwardIcon : ArrowDownwardIcon;

  return (
    <th className="px-4 py-3">
      <button
        onClick={() => onSort(column)}
        className="flex items-center gap-1 hover:text-slate-950 transition-colors"
      >
        {children}
        {isActive && <Icon className="h-4 w-4" />}
      </button>
    </th>
  );
}

type TransactionItem = {
  addedByName: string;
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

type TransactionGroup = {
  description: string;
  items: TransactionItem[];
  totalAmount: number;
  count: number;
};

function buildGroups(items: TransactionItem[]): TransactionGroup[] {
  const map = new Map<string, TransactionItem[]>();
  for (const item of items) {
    const existing = map.get(item.description) ?? [];
    existing.push(item);
    map.set(item.description, existing);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([description, groupItems]) => ({
      description,
      items: [...groupItems].sort(
        (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
      ),
      totalAmount: groupItems.reduce((sum, t) => sum + parseFloat(t.amount), 0),
      count: groupItems.length,
    }));
}

type TransactionTableProps = Readonly<{
  items: TransactionItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onEdit: (transaction: TransactionItem) => void;
  sortBy?: "description" | "categoryName" | "transactionDate" | "amount";
  sortOrder?: "asc" | "desc";
  onSort: (column: "description" | "categoryName" | "transactionDate" | "amount") => void;
  groupBy?: "description";
}>;

export function TransactionTable({
  items,
  selectedIds,
  onSelectionChange,
  onEdit,
  sortBy,
  sortOrder,
  onSort,
  groupBy,
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

  if (groupBy === "description") {
    const groups = buildGroups(items);
    const allGroupIds = items.map((i) => i.id);

    return (
      <>
        {/* Mobile grouped layout */}
        <div className="block md:hidden space-y-4">
          {groups.map((group) => (
            <div key={group.description} className="rounded-[20px] border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between bg-slate-50 px-4 py-3 border-b border-slate-200">
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{group.description}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{group.count} transaction{group.count !== 1 ? "s" : ""}</p>
                </div>
                <span className="font-semibold text-slate-900 text-sm">
                  {formatCurrency(group.totalAmount.toFixed(2))}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {group.items.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  return (
                    <div key={item.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) =>
                            onSelectionChange(
                              e.target.checked
                                ? [...selectedIds, item.id]
                                : selectedIds.filter((id) => id !== item.id),
                            )
                          }
                        />
                        <div>
                          <Badge variant={item.type === "income" ? "success" : "neutral"}>
                            <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.categoryColor }} />
                            {item.categoryName}
                          </Badge>
                          <p className="text-xs text-slate-500 mt-1">{item.transactionDate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={item.type === "income" ? "font-semibold text-emerald-600 text-sm" : "font-semibold text-slate-900 text-sm"}>
                          {item.type === "income" ? "+" : "-"}{formatCurrency(item.amount)}
                        </span>
                        <Button variant="ghost" onClick={() => onEdit(item)}>
                          <EditIcon className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" onClick={() => setTransactionToDelete(item)}>
                          <DeleteIcon className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Desktop grouped layout */}
        <div className="hidden md:block overflow-hidden rounded-[28px] border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === items.length && items.length > 0}
                    onChange={(e) => onSelectionChange(e.target.checked ? allGroupIds : [])}
                  />
                </th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {groups.map((group) => (
                <Fragment key={`group-${group.description}`}>
                  <tr className="bg-slate-50">
                    <td colSpan={5} className="px-4 py-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-900">{group.description}</span>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                            {group.count} transaction{group.count !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <span className="font-semibold text-slate-700">
                          {formatCurrency(group.totalAmount.toFixed(2))} total
                        </span>
                      </div>
                    </td>
                  </tr>
                  {group.items.map((item) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-3 align-top">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) =>
                              onSelectionChange(
                                e.target.checked
                                  ? [...selectedIds, item.id]
                                  : selectedIds.filter((id) => id !== item.id),
                              )
                            }
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <Badge variant={item.type === "income" ? "success" : "neutral"}>
                            <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.categoryColor }} />
                            {item.categoryName}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 align-top text-slate-600">{item.transactionDate}</td>
                        <td className="px-4 py-3 align-top">
                          <span className={item.type === "income" ? "font-semibold text-emerald-600" : "font-semibold text-slate-900"}>
                            {item.type === "income" ? "+" : "-"}{formatCurrency(item.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => onEdit(item)}>
                              <EditIcon className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" onClick={() => setTransactionToDelete(item)}>
                              <DeleteIcon className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
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
            <Button variant="secondary" onClick={() => setTransactionToDelete(null)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  if (!transactionToDelete) return;
                  const result = await deleteTransaction(transactionToDelete.id);
                  if (!result.success) { toast.error(result.error); return; }
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

  return (
    <>
      {/* Mobile Card Layout */}
      <div className="block md:hidden space-y-3">
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);

          return (
            <div key={item.id} className="rounded-[20px] border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
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
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{item.description}</p>
                    {item.notes && (
                      <p className="mt-1 text-xs text-slate-500">{item.notes}</p>
                    )}
                    <div className="mt-2 flex items-center gap-2">
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
                      <span className="text-xs text-slate-500">{item.transactionDate}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Added by {item.addedByName}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
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
                  <div className="flex gap-1">
                    <Button variant="ghost" onClick={() => onEdit(item)}>
                      <EditIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setTransactionToDelete(item)}
                    >
                      <DeleteIcon className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden md:block overflow-hidden rounded-[28px] border border-slate-200">
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
              <SortableHeader column="description" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                Description
              </SortableHeader>
              <SortableHeader column="categoryName" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                Category
              </SortableHeader>
              <SortableHeader column="transactionDate" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                Date
              </SortableHeader>
              <SortableHeader column="amount" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
                Amount
              </SortableHeader>
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
                    <p className="mt-2 text-xs text-slate-500">
                      Added by {item.addedByName}
                    </p>
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
                        <EditIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setTransactionToDelete(item)}
                      >
                        <DeleteIcon className="h-4 w-4 text-red-500" />
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
