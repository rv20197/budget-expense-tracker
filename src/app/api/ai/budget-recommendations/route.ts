import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, gte, lte, or, sql } from "drizzle-orm";

import { openai } from "@/lib/ai/openai";
import { getSession } from "@/lib/auth/session";
import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { endOfMonth, startOfMonth } from "@/lib/utils";

const requestSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
});

type AiRecommendation = {
  categoryId: string;
  category: string;
  currentBudget: number;
  suggestedBudget: number;
  reasoning: string;
};

type AiRaw = {
  recommendations?: Partial<AiRecommendation>[];
};

export function getPrevMonths(
  month: number,
  year: number,
  count: number,
): Array<{ month: number; year: number }> {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(year, month - 2 - i, 1);
    return { month: d.getMonth() + 1, year: d.getFullYear() };
  });
}

async function fetchData(householdId: string, userId: string, month: number, year: number) {
  const prevMonths = getPrevMonths(month, year, 3);
  const oldest = prevMonths[prevMonths.length - 1];
  const latest = prevMonths[0];
  const rangeFrom = startOfMonth(oldest.month, oldest.year);
  const rangeTo = endOfMonth(latest.month, latest.year);

  const [categoryRows, spendRows] = await Promise.all([
    // Expense categories + their current-month budget (if any)
    db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        budgetAmount: budgets.amount,
      })
      .from(categories)
      .leftJoin(
        budgets,
        and(
          eq(budgets.categoryId, categories.id),
          eq(budgets.householdId, householdId),
          eq(budgets.month, month),
          eq(budgets.year, year),
          or(
            eq(budgets.scope, "household"),
            and(eq(budgets.scope, "personal"), eq(budgets.createdBy, userId)),
          ),
        ),
      )
      .where(
        and(
          eq(categories.householdId, householdId),
          eq(categories.type, "expense"),
          or(
            eq(categories.scope, "household"),
            and(eq(categories.scope, "personal"), eq(categories.createdBy, userId)),
          ),
        ),
      ),

    // Monthly expense totals per category over the previous 3 months
    db
      .select({
        categoryId: transactions.categoryId,
        monthStr: sql<string>`to_char(date_trunc('month', ${transactions.transactionDate}), 'YYYY-MM')`,
        total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.householdId, householdId),
          eq(transactions.type, "expense"),
          gte(transactions.transactionDate, rangeFrom),
          lte(transactions.transactionDate, rangeTo),
        ),
      )
      .groupBy(
        transactions.categoryId,
        sql`date_trunc('month', ${transactions.transactionDate})`,
      ),
  ]);

  // Build per-category spend map: categoryId → { [YYYY-MM]: total }
  const spendMap = new Map<string, Map<string, number>>();
  for (const row of spendRows) {
    if (!spendMap.has(row.categoryId)) {
      spendMap.set(row.categoryId, new Map());
    }
    spendMap.get(row.categoryId)!.set(row.monthStr, Number(row.total));
  }

  // Only include categories with a budget or with spend in the past 3 months
  const relevant = categoryRows.filter(
    (c) => c.budgetAmount !== null || spendMap.has(c.categoryId),
  );

  return { relevant, spendMap, prevMonths };
}

function buildPrompt(
  data: Awaited<ReturnType<typeof fetchData>>,
  month: number,
  year: number,
) {
  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));

  const lines = data.relevant.map((c) => {
    const monthlyTotals = data.prevMonths.map((pm) => {
      const key = `${pm.year}-${String(pm.month).padStart(2, "0")}`;
      const total = data.spendMap.get(c.categoryId)?.get(key) ?? 0;
      const label = new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
      }).format(new Date(pm.year, pm.month - 1, 1));
      return `${label}: ₹${total.toFixed(2)}`;
    });
    const totalSpend = [...(data.spendMap.get(c.categoryId)?.values() ?? [])].reduce(
      (sum, v) => sum + v,
      0,
    );
    const avgSpend = totalSpend / 3;
    const currentBudget = c.budgetAmount !== null ? Number(c.budgetAmount) : 0;

    return (
      `- Category: ${c.categoryName} (id: ${c.categoryId})\n` +
      `  Current budget: ₹${currentBudget.toFixed(2)}\n` +
      `  Avg monthly spend (3 months): ₹${avgSpend.toFixed(2)}\n` +
      `  Monthly breakdown: ${monthlyTotals.join(", ")}`
    );
  });

  const system = `You are a personal finance advisor. Given a household's expense categories, their current budgets, and their historical monthly spend, suggest adjusted budgets for ${monthLabel}.

Return ONLY this JSON shape — no extra text:
{
  "recommendations": [
    {
      "categoryId": "<exact id from the data>",
      "category": "<category name>",
      "currentBudget": <number>,
      "suggestedBudget": <number>,
      "reasoning": "<one sentence>"
    }
  ]
}

Rules:
- Only include a recommendation when the suggested budget meaningfully differs from the current (>5% difference or zero-to-nonzero change)
- "categoryId" must be an exact id from the data — never invent one
- "suggestedBudget" must be a positive number (suggest at least ₹1)
- "reasoning" must be a single concise sentence referencing actual numbers
- Round suggestedBudget to the nearest 50 or 100 for readability`;

  const user = `Target month: ${monthLabel}\n\nCategory data:\n${lines.join("\n\n")}`;

  return { system, user };
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user.householdId) {
      return NextResponse.json({ recommendations: null }, { status: 401 });
    }

    const { id: userId, householdId } = session.user;
    const parsed = requestSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ recommendations: null });
    }

    const { month, year } = parsed.data;
    const data = await fetchData(householdId, userId, month, year);

    if (data.relevant.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    const { system, user } = buildPrompt(data, month, year);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const raw = JSON.parse(
      response.choices[0].message.content ?? "{}",
    ) as AiRaw;

    const validIds = new Set(data.relevant.map((c) => c.categoryId));
    const recommendations: AiRecommendation[] = (raw.recommendations ?? [])
      .filter(
        (r): r is AiRecommendation =>
          typeof r.categoryId === "string" &&
          validIds.has(r.categoryId) &&
          typeof r.category === "string" &&
          typeof r.currentBudget === "number" &&
          typeof r.suggestedBudget === "number" &&
          r.suggestedBudget > 0 &&
          typeof r.reasoning === "string",
      );

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("[AI budget-recommendations]", error);
    return NextResponse.json({ recommendations: null });
  }
}
