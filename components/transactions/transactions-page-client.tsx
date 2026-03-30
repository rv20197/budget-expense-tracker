"use client";

import { useState } from "react";

import { BulkDeleteBar } from "@/components/transactions/bulk-delete-bar";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { Button } from "@/components/ui/button";

type TransactionsPageClientProps = Readonly<{
  categories: Array<{
    id: string;
    name: string;
    type: "income" | "expense";
  }>;
  items: Array<{
    id: string;
    description: string;
    amount: string;
    type: "income" | "expense";
    transactionDate: string;
    notes: string | null;
    categoryId: string;
    categoryName: string;
    categoryColor: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
  exportHref: string;
}>;

export function TransactionsPageClient({
  categories,
  items,
  total,
  page,
  pageSize,
  exportHref,
}: TransactionsPageClientProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionsPageClientProps["items"][number] | null>(null);

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Transactions</h2>
          <p className="mt-1 text-sm text-slate-600">
            Showing {(page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, total)} of {total} transactions.
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href={exportHref}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            Export CSV
          </a>
          <Button
            onClick={() => {
              setEditingTransaction(null);
              setIsModalOpen(true);
            }}
          >
            Add transaction
          </Button>
        </div>
      </div>
      <TransactionTable
        items={items}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onEdit={(transaction) => {
          setEditingTransaction(transaction);
          setIsModalOpen(true);
        }}
      />
      <TransactionForm
        open={isModalOpen}
        onClose={() => {
          setEditingTransaction(null);
          setIsModalOpen(false);
        }}
        categories={categories}
        transaction={editingTransaction}
      />
      <BulkDeleteBar
        selectedIds={selectedIds}
        onClear={() => setSelectedIds([])}
      />
    </>
  );
}
