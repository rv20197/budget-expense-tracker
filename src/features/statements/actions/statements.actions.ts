"use server";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  lte,
} from "drizzle-orm";

import { db } from "@/db";
import { categories, statementUploads, transactions } from "@/db/schema";
import { getAuthContext } from "@/lib/auth/getUser";
import { toMoneyString } from "@/lib/utils";

export type StatementUploadItem = {
  id: string;
  fileName: string;
  bankName: string;
  status: string;
  totalFound: number;
  duplicatesSkipped: number;
  totalInserted: number;
  statementPeriodStart: string | null;
  statementPeriodEnd: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type StatementTransactionItem = {
  id: string;
  description: string;
  rawDescription: string | null;
  merchantName: string | null;
  amount: string;
  type: "income" | "expense";
  transactionDate: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  confidenceScore: number | null;
};

type TransactionFilters = {
  categoryId?: string;
  type?: "income" | "expense";
  dateFrom?: string;
  dateTo?: string;
  lowConfidenceOnly?: boolean;
  page?: number;
  limit?: number;
};

function formatDate(d: Date | string | null): string | null {
  if (!d) return null;
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().slice(0, 10);
}

export async function getStatements(): Promise<StatementUploadItem[]> {
  const { householdId } = await getAuthContext();

  const uploads = await db
    .select({
      id: statementUploads.id,
      fileName: statementUploads.fileName,
      bankName: statementUploads.bankName,
      status: statementUploads.status,
      totalFound: statementUploads.totalFound,
      duplicatesSkipped: statementUploads.duplicatesSkipped,
      totalInserted: statementUploads.totalInserted,
      statementPeriodStart: statementUploads.statementPeriodStart,
      statementPeriodEnd: statementUploads.statementPeriodEnd,
      errorMessage: statementUploads.errorMessage,
      createdAt: statementUploads.createdAt,
    })
    .from(statementUploads)
    .where(eq(statementUploads.householdId, householdId))
    .orderBy(desc(statementUploads.createdAt));

  return uploads.map((u) => ({
    ...u,
    statementPeriodStart: formatDate(u.statementPeriodStart),
    statementPeriodEnd: formatDate(u.statementPeriodEnd),
    createdAt: u.createdAt instanceof Date
      ? u.createdAt.toISOString()
      : String(u.createdAt),
  }));
}

export async function getStatementById(id: string): Promise<StatementUploadItem | null> {
  const { householdId } = await getAuthContext();

  const [upload] = await db
    .select({
      id: statementUploads.id,
      fileName: statementUploads.fileName,
      bankName: statementUploads.bankName,
      status: statementUploads.status,
      totalFound: statementUploads.totalFound,
      duplicatesSkipped: statementUploads.duplicatesSkipped,
      totalInserted: statementUploads.totalInserted,
      statementPeriodStart: statementUploads.statementPeriodStart,
      statementPeriodEnd: statementUploads.statementPeriodEnd,
      errorMessage: statementUploads.errorMessage,
      createdAt: statementUploads.createdAt,
    })
    .from(statementUploads)
    .where(
      and(
        eq(statementUploads.id, id),
        eq(statementUploads.householdId, householdId),
      ),
    )
    .limit(1);

  if (!upload) return null;

  return {
    ...upload,
    statementPeriodStart: formatDate(upload.statementPeriodStart),
    statementPeriodEnd: formatDate(upload.statementPeriodEnd),
    createdAt: upload.createdAt instanceof Date
      ? upload.createdAt.toISOString()
      : String(upload.createdAt),
  };
}

export async function getStatementTransactions(
  uploadId: string,
  filters: TransactionFilters = {},
): Promise<{
  items: StatementTransactionItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  categories: { id: string; name: string; type: string }[];
}> {
  const { householdId } = await getAuthContext();

  // Verify ownership
  const [upload] = await db
    .select({ id: statementUploads.id })
    .from(statementUploads)
    .where(
      and(
        eq(statementUploads.id, uploadId),
        eq(statementUploads.householdId, householdId),
      ),
    )
    .limit(1);

  if (!upload) {
    return { items: [], page: 1, limit: 50, total: 0, totalPages: 0, categories: [] };
  }

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters.limit ?? 50));
  const offset = (page - 1) * limit;

  const where = and(
    eq(transactions.uploadId, uploadId),
    filters.categoryId ? eq(transactions.categoryId, filters.categoryId) : undefined,
    filters.type ? eq(transactions.type, filters.type) : undefined,
    filters.dateFrom
      ? gte(transactions.transactionDate, new Date(filters.dateFrom))
      : undefined,
    filters.dateTo
      ? lte(transactions.transactionDate, new Date(filters.dateTo))
      : undefined,
    filters.lowConfidenceOnly ? isNotNull(transactions.confidenceScore) : undefined,
  );

  const [items, [{ total }], householdCategories] = await Promise.all([
    db
      .select({
        id: transactions.id,
        description: transactions.description,
        rawDescription: transactions.rawDescription,
        merchantName: transactions.merchantName,
        amount: transactions.amount,
        type: transactions.type,
        transactionDate: transactions.transactionDate,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        confidenceScore: transactions.confidenceScore,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(where)
      .orderBy(desc(transactions.transactionDate), asc(transactions.id))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(transactions).where(where),
    db
      .select({ id: categories.id, name: categories.name, type: categories.type })
      .from(categories)
      .where(eq(categories.householdId, householdId))
      .orderBy(asc(categories.name)),
  ]);

  let filteredItems = items;
  if (filters.lowConfidenceOnly) {
    filteredItems = items.filter((t) => (t.confidenceScore ?? 1) < 0.6);
  }

  return {
    items: filteredItems.map((t) => ({
      ...t,
      amount: toMoneyString(t.amount),
      transactionDate:
        t.transactionDate instanceof Date
          ? t.transactionDate.toISOString().slice(0, 10)
          : String(t.transactionDate),
    })),
    page,
    limit,
    total: Number(total),
    totalPages: Math.ceil(Number(total) / limit),
    categories: householdCategories,
  };
}
