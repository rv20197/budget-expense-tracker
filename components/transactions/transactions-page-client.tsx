"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { BulkDeleteBar } from "@/components/transactions/bulk-delete-bar";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { Pagination } from "@/components/ui/pagination";
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
  sortBy?: "description" | "categoryName" | "transactionDate" | "amount";
  sortOrder?: "asc" | "desc";
  exportHref: string;
}>;

export function TransactionsPageClient({
  categories,
  items,
  total,
  page,
  pageSize,
  sortBy,
  sortOrder,
  exportHref,
}: TransactionsPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionsPageClientProps["items"][number] | null>(null);

  const totalPages = Math.ceil(total / pageSize);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`/transactions?${params.toString()}`);
  };

  const handleSort = (column: "description" | "categoryName" | "transactionDate" | "amount") => {
    const params = new URLSearchParams(searchParams);
    const currentSortBy = sortBy;
    const currentSortOrder = sortOrder ?? "desc";

    if (currentSortBy === column) {
      // Toggle sort order if same column
      params.set("sortOrder", currentSortOrder === "asc" ? "desc" : "asc");
    } else {
      // New column, default to desc
      params.set("sortBy", column);
      params.set("sortOrder", "desc");
    }
    // Reset to page 1 when sorting changes
    params.set("page", "1");
    router.push(`/transactions?${params.toString()}`);
  };

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Transactions</h2>
          <p className="mt-1 text-sm text-slate-600">
            Showing {(page - 1) * pageSize + 1}-
            {Math.min(page * pageSize, total)} of {total} transactions.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href={exportHref}
            className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2.5 text-sm font-medium text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50 min-h-[44px]"
          >
            Export CSV
          </a>
          <Button
            data-add-transaction
            onClick={() => {
              setEditingTransaction(null);
              setIsModalOpen(true);
            }}
            className="w-full sm:w-auto"
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
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
      />
      <div className="mt-6 flex justify-center">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
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
