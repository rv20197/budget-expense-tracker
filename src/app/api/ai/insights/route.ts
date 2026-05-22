import { NextResponse } from "next/server";
import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";

import { chat } from "@/lib/ai/openai";
import { getSession } from "@/lib/auth/session";
import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { endOfMonth, startOfMonth } from "@/lib/utils";

// In-memory cache: key = "{householdId}:{YYYY-MM}"
const insightCache = new Map<string, { text: string; ts: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const DOW_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type InsightsData = {
  monthLabel: string;
  totalIncome: number;
  totalExpense: number;
  totalBudget: number;
  categoryBreakdown: { name: string; amount: number; pct: number }[];
  topExpenses: {
    description: string;
    category: string;
    amount: number;
    date: string;
  }[];
  dowPattern: { day: string; total: number; count: number }[];
};

async function fetchInsightsData(
  householdId: string,
  userId: string,
  month: number,
  year: number,
): Promise<InsightsData> {
  const from = startOfMonth(month, year);
  const to = endOfMonth(month, year);
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(from);

  const [incomeRow, expenseRow, budgetRow, categoryRows, topRows, dowRows] =
    await Promise.all([
      db
        .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.householdId, householdId),
            eq(transactions.type, "income"),
            gte(transactions.transactionDate, from),
            lte(transactions.transactionDate, to),
          ),
        ),

      db
        .select({ total: sql<string>`coalesce(sum(${transactions.amount}), 0)` })
        .from(transactions)
        .where(
          and(
            eq(transactions.householdId, householdId),
            eq(transactions.type, "expense"),
            gte(transactions.transactionDate, from),
            lte(transactions.transactionDate, to),
          ),
        ),

      db
        .select({ total: sql<string>`coalesce(sum(${budgets.amount}), 0)` })
        .from(budgets)
        .where(
          and(
            eq(budgets.householdId, householdId),
            eq(budgets.month, month),
            eq(budgets.year, year),
            or(
              eq(budgets.scope, "household"),
              and(
                eq(budgets.scope, "personal"),
                eq(budgets.createdBy, userId),
              ),
            ),
          ),
        ),

      db
        .select({
          name: categories.name,
          total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
        })
        .from(transactions)
        .innerJoin(categories, eq(categories.id, transactions.categoryId))
        .where(
          and(
            eq(transactions.householdId, householdId),
            eq(transactions.type, "expense"),
            gte(transactions.transactionDate, from),
            lte(transactions.transactionDate, to),
          ),
        )
        .groupBy(categories.id)
        .orderBy(desc(sql`sum(${transactions.amount})`)),

      db
        .select({
          description: transactions.description,
          amount: transactions.amount,
          category: categories.name,
          date: transactions.transactionDate,
        })
        .from(transactions)
        .innerJoin(categories, eq(categories.id, transactions.categoryId))
        .where(
          and(
            eq(transactions.householdId, householdId),
            eq(transactions.type, "expense"),
            gte(transactions.transactionDate, from),
            lte(transactions.transactionDate, to),
          ),
        )
        .orderBy(desc(transactions.amount))
        .limit(5),

      db
        .select({
          dow: sql<number>`extract(dow from ${transactions.transactionDate})`,
          total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.householdId, householdId),
            eq(transactions.type, "expense"),
            gte(transactions.transactionDate, from),
            lte(transactions.transactionDate, to),
          ),
        )
        .groupBy(sql`extract(dow from ${transactions.transactionDate})`),
    ]);

  const totalExpense = Number(expenseRow[0]?.total ?? 0);

  return {
    monthLabel,
    totalIncome: Number(incomeRow[0]?.total ?? 0),
    totalExpense,
    totalBudget: Number(budgetRow[0]?.total ?? 0),
    categoryBreakdown: categoryRows.map((r) => ({
      name: r.name,
      amount: Number(r.total),
      pct:
        totalExpense > 0
          ? Math.round((Number(r.total) / totalExpense) * 100)
          : 0,
    })),
    topExpenses: topRows.map((r) => ({
      description: r.description,
      category: r.category,
      amount: Number(r.amount),
      date: r.date.toISOString().slice(0, 10),
    })),
    dowPattern: dowRows
      .map((r) => ({
        day: DOW_LABELS[Number(r.dow)] ?? "Unknown",
        total: Number(r.total),
        count: Number(r.count),
      }))
      .sort((a, b) => DOW_LABELS.indexOf(a.day) - DOW_LABELS.indexOf(b.day)),
  };
}

function buildPrompt(data: InsightsData): { system: string; user: string } {
  const system =
    "You are a personal finance analyst. Given a month of spending data, write a 3–5 sentence plain-English summary that highlights what is notable: areas of concern, positive patterns, or standout trends. Be specific with numbers. Write in the second person (\"you spent\", \"your largest expense\"). No bullet points, headers, or markdown.";

  const categoryLines =
    data.categoryBreakdown.length > 0
      ? data.categoryBreakdown
          .slice(0, 8)
          .map((c) => `  - ${c.name}: ₹${c.amount.toFixed(2)} (${c.pct}%)`)
          .join("\n")
      : "  (none)";

  const topLines =
    data.topExpenses.length > 0
      ? data.topExpenses
          .map(
            (e) =>
              `  - "${e.description}" (${e.category}): ₹${e.amount.toFixed(2)} on ${e.date}`,
          )
          .join("\n")
      : "  (none)";

  const dowLines =
    data.dowPattern.length > 0
      ? data.dowPattern
          .map(
            (d) =>
              `  - ${d.day}: ₹${d.total.toFixed(2)} across ${d.count} transaction(s)`,
          )
          .join("\n")
      : "  (no data)";

  const budgetNote =
    data.totalBudget > 0
      ? `Total budget: ₹${data.totalBudget.toFixed(2)}\nBudget remaining: ₹${(data.totalBudget - data.totalExpense).toFixed(2)}`
      : "No budgets configured for this month.";

  const user = `Month: ${data.monthLabel}
Total income: ₹${data.totalIncome.toFixed(2)}
Total expenses: ₹${data.totalExpense.toFixed(2)}
${budgetNote}

Expense breakdown by category:
${categoryLines}

Top 5 largest expenses:
${topLines}

Spending by day of week:
${dowLines}`;

  return { system, user };
}

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user.householdId) {
      return NextResponse.json({ insight: null }, { status: 401 });
    }

    const { id: userId, householdId } = session.user;
    const url = new URL(request.url);
    const monthParam = url.searchParams.get("month") ?? "";
    const bust = url.searchParams.get("bust") === "true";

    const now = new Date();
    let month = now.getMonth() + 1;
    let year = now.getFullYear();
    const match = /^(\d{4})-(\d{2})$/.exec(monthParam);
    if (match) {
      year = Number(match[1]);
      month = Number(match[2]);
    }

    const cacheKey = `${householdId}:${year}-${String(month).padStart(2, "0")}`;

    if (!bust) {
      const cached = insightCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        return NextResponse.json({ insight: cached.text, cached: true });
      }
    }

    const data = await fetchInsightsData(householdId, userId, month, year);
    const { system, user } = buildPrompt(data);
    const insight = await chat(system, user);

    insightCache.set(cacheKey, { text: insight, ts: Date.now() });

    return NextResponse.json({ insight, cached: false });
  } catch (error) {
    console.error("[AI insights]", error);
    return NextResponse.json({ insight: null });
  }
}
