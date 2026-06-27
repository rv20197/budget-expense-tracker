"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";

import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import type {
  StatementTransactionItem,
  StatementUploadItem,
} from "@/features/statements/actions/statements.actions";
import { formatCurrency } from "@/lib/utils";

type Category = { id: string; name: string; type: string };

type Props = Readonly<{
  uploadId: string;
  upload: StatementUploadItem;
  items: StatementTransactionItem[];
  total: number;
  page: number;
  totalPages: number;
  categories: Category[];
}>;

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  if (score >= 0.8) return <Badge variant="success">High</Badge>;
  if (score >= 0.5) return <Badge variant="warning">Medium</Badge>;
  return <Badge variant="danger">Low</Badge>;
}

function InlineCategorySelect({
  uploadId,
  txnId,
  currentCategoryId,
  categories,
}: {
  uploadId: string;
  txnId: string;
  currentCategoryId: string;
  categories: Category[];
}) {
  const [value, setValue] = useState(currentCategoryId);
  const [, startTransition] = useTransition();

  const handleChange = (newCategoryId: string) => {
    const prev = value;
    setValue(newCategoryId);
    startTransition(async () => {
      const res = await fetch(
        `/api/v1/statements/${uploadId}/transactions/${txnId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ categoryId: newCategoryId }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error ?? "Failed to update category.");
        setValue(prev);
        return;
      }
      toast.success("Category updated.");
    });
  };

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-[180px] rounded-xl border border-slate-200 px-2 py-1 text-xs outline-none focus:border-indigo-400"
    >
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

export function StatementTransactionsView({
  uploadId,
  upload,
  items,
  total,
  page,
  totalPages,
  categories,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    router.push(`/statements/${uploadId}?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    router.push(`/statements/${uploadId}?${params.toString()}`);
  };

  const categoryFilter = searchParams.get("categoryId") ?? "";
  const typeFilter = searchParams.get("type") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const lowConfidence = searchParams.get("lowConfidence") === "true";

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">{upload.fileName}</h2>
        <p className="text-sm text-slate-500">
          {upload.bankName} &middot; {upload.totalInserted} imported &middot; {upload.duplicatesSkipped} duplicates skipped
        </p>
      </div>

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap gap-3 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
        <select
          value={categoryFilter}
          onChange={(e) => updateParam("categoryId", e.target.value)}
          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => updateParam("type", e.target.value)}
          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none"
        >
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => updateParam("dateFrom", e.target.value)}
          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none"
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => updateParam("dateTo", e.target.value)}
          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none"
          placeholder="To"
        />

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={lowConfidence}
            onChange={(e) =>
              updateParam("lowConfidence", e.target.checked ? "true" : "")
            }
          />
          Low confidence only
        </label>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center justify-center rounded-[28px] border border-slate-200 bg-white py-12">
          <p className="text-slate-500">No transactions match the selected filters.</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="block md:hidden space-y-3">
            {items.map((t) => (
              <div key={t.id} className="rounded-[20px] border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{t.description}</p>
                    {t.rawDescription && t.rawDescription !== t.description && (
                      <p className="mt-0.5 text-xs text-slate-400 truncate">{t.rawDescription}</p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-500">{t.transactionDate}</span>
                      <Badge variant={t.type === "income" ? "success" : "neutral"}>
                        {t.type}
                      </Badge>
                      <ConfidenceBadge score={t.confidenceScore} />
                    </div>
                    <div className="mt-2">
                      <InlineCategorySelect
                        uploadId={uploadId}
                        txnId={t.id}
                        currentCategoryId={t.categoryId}
                        categories={categories}
                      />
                    </div>
                  </div>
                  <span
                    className={`font-semibold ${
                      t.type === "income" ? "text-emerald-600" : "text-slate-900"
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"}
                    {formatCurrency(t.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-[28px] border border-slate-200 bg-white">
            <Table>
              <TableHead>
                <TableRow
                  sx={{
                    "& th": {
                      fontWeight: 600,
                      color: "#475569",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: "1px solid #e2e8f0",
                    },
                  }}
                >
                  <TableCell>Date</TableCell>
                  <TableCell>Merchant</TableCell>
                  <TableCell>Raw Description</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Confidence</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((t) => (
                  <TableRow
                    key={t.id}
                    sx={{ "&:last-child td": { border: 0 } }}
                  >
                    <TableCell>
                      <span className="text-sm text-slate-600">{t.transactionDate}</span>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={t.description} placement="top">
                        <span className="block max-w-[160px] truncate text-sm font-medium text-slate-900">
                          {t.description}
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={t.rawDescription ?? ""} placement="top">
                        <span className="block max-w-[200px] truncate text-xs text-slate-400">
                          {t.rawDescription ?? "—"}
                        </span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-sm font-semibold ${
                          t.type === "income" ? "text-emerald-600" : "text-slate-900"
                        }`}
                      >
                        {t.type === "income" ? "+" : "-"}
                        {formatCurrency(t.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.type === "income" ? "success" : "neutral"}>
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <InlineCategorySelect
                        uploadId={uploadId}
                        txnId={t.id}
                        currentCategoryId={t.categoryId}
                        categories={categories}
                      />
                    </TableCell>
                    <TableCell>
                      <ConfidenceBadge score={t.confidenceScore} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}
            </p>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      )}
    </div>
  );
}
