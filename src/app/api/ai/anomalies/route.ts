import { NextResponse } from "next/server";
import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";

import { openai } from "@/lib/ai/openai";
import { getSession } from "@/lib/auth/session";
import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { endOfMonth, startOfMonth } from "@/lib/utils";

// In-memory cache: key = "{householdId}:{YYYY-MM}"
const anomalyCache = new Map<
  string,
  { alerts: AnomalyAlert[]; ts: number }
>();
const THROTTLE_MS = 60 * 60 * 1000; // 1 hour

export type AnomalyAlert = {
  type: "overspend" | "unusual_transaction" | "budget_exceeded";
  category: string;
  message: string;
  severity: "warning" | "critical";
};

type AiRaw = {
  alerts?: Partial<AnomalyAlert>[];
};

async function fetchAnomalyData(
  householdId: string,
  userId: string,
  month: number,
  year: number,
) {
  const now = new Date();
  const currentFrom = startOfMonth(month, year);
  const currentTo = endOfMonth(month, year);

  // Previous 2 months
  const prev1 = new Date(year, month - 2, 1);
  const prev2 = new Date(year, month - 3, 1);
  const baselineFrom = startOfMonth(prev2.getMonth() + 1, prev2.getFullYear());
  const baselineTo = endOfMonth(prev1.getMonth() + 1, prev1.getFullYear());

  const [
    currentTotals,
    baselineTotals,
    baselineAvgTx,
    topTransactions,
    budgetRows,
  ] = await Promise.all([
    // Current month expense total per category
    db
      .select({
        categoryId: categories.id,
        categoryName: categories.name,
        total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
        txCount: sql<number>`count(*)`,
      })
      .from(transactions)
      .innerJoin(categories, eq(categories.id, transactions.categoryId))
      .where(
        and(
          eq(transactions.householdId, householdId),
          eq(transactions.type, "expense"),
          gte(transactions.transactionDate, currentFrom),
          lte(transactions.transactionDate, currentTo),
        ),
      )
      .groupBy(categories.id),

    // Previous 2 months monthly totals per category (for avg baseline)
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
          gte(transactions.transactionDate, baselineFrom),
          lte(transactions.transactionDate, baselineTo),
        ),
      )
      .groupBy(
        transactions.categoryId,
        sql`date_trunc('month', ${transactions.transactionDate})`,
      ),

    // Per-category average single-transaction amount over past 2 months
    db
      .select({
        categoryId: transactions.categoryId,
        avgAmount: sql<string>`coalesce(avg(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.householdId, householdId),
          eq(transactions.type, "expense"),
          gte(transactions.transactionDate, baselineFrom),
          lte(transactions.transactionDate, baselineTo),
        ),
      )
      .groupBy(transactions.categoryId),

    // Top 10 largest individual transactions this month
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
          gte(transactions.transactionDate, currentFrom),
          lte(transactions.transactionDate, currentTo),
        ),
      )
      .orderBy(desc(transactions.amount))
      .limit(10),

    // Current month budgets
    db
      .select({
        categoryId: budgets.categoryId,
        amount: budgets.amount,
      })
      .from(budgets)
      .where(
        and(
          eq(budgets.householdId, householdId),
          eq(budgets.month, month),
          eq(budgets.year, year),
          or(
            eq(budgets.scope, "household"),
            and(eq(budgets.scope, "personal"), eq(budgets.createdBy, userId)),
          ),
        ),
      ),
  ]);

  // Compute 2-month average per category from baselineTotals
  const baselineMap = new Map<string, number[]>();
  for (const row of baselineTotals) {
    const list = baselineMap.get(row.categoryId) ?? [];
    list.push(Number(row.total));
    baselineMap.set(row.categoryId, list);
  }
  const baselineAvgMap = new Map<string, number>();
  for (const [id, totals] of baselineMap) {
    baselineAvgMap.set(
      id,
      totals.reduce((s, v) => s + v, 0) / 2,
    );
  }

  // Per-category avg transaction amount map
  const avgTxMap = new Map<string, number>();
  for (const row of baselineAvgTx) {
    avgTxMap.set(row.categoryId, Number(row.avgAmount));
  }

  // Budget map
  const budgetMap = new Map<string, number>();
  for (const row of budgetRows) {
    budgetMap.set(row.categoryId, Number(row.amount));
  }

  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(year, month, 0).getDate();

  return {
    monthLabel: new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(currentFrom),
    dayOfMonth,
    daysInMonth,
    currentTotals,
    baselineAvgMap,
    avgTxMap,
    topTransactions,
    budgetMap,
  };
}

function buildAnomalyPrompt(data: Awaited<ReturnType<typeof fetchAnomalyData>>) {
  const categoryLines = data.currentTotals.map((c) => {
    const baselineAvg = data.baselineAvgMap.get(c.categoryId) ?? 0;
    const budget = data.budgetMap.get(c.categoryId) ?? 0;
    const avgTx = data.avgTxMap.get(c.categoryId) ?? 0;
    const current = Number(c.total);

    return (
      `- ${c.categoryName}: current spend ₹${current.toFixed(2)}` +
      `, 2-month avg ₹${baselineAvg.toFixed(2)}` +
      `, budget ₹${budget.toFixed(2)} (0 = none)` +
      `, avg transaction ₹${avgTx.toFixed(2)} (baseline)` +
      `, ${c.txCount} transaction(s) this month`
    );
  });

  const topLines = data.topTransactions.map(
    (t) =>
      `- "${t.description}" (${t.category}): ₹${Number(t.amount).toFixed(2)} on ${t.date.toISOString().slice(0, 10)}`,
  );

  const system = `You are a personal finance anomaly detector. Analyze the household's spending data and identify real anomalies.

Return ONLY this JSON — no extra text:
{
  "alerts": [
    {
      "type": "overspend" | "unusual_transaction" | "budget_exceeded",
      "category": "<category name>",
      "message": "<one specific sentence with numbers>",
      "severity": "warning" | "critical"
    }
  ]
}

Detection rules (flag ONLY genuine issues):
1. "overspend" — category spend is >30% above its 2-month average (only if baseline avg > 0)
2. "unusual_transaction" — a single transaction is >2× the category's baseline per-transaction average (only if baseline avg > 0 and the amount is significant)
3. "budget_exceeded" — current spend already equals or exceeds the budget (only if budget > 0)

Severity guide:
- "critical": >75% over baseline, or budget exceeded with many days remaining in the month
- "warning": 30–75% over baseline, or budget just barely exceeded

Only include alerts for genuine anomalies. Return an empty array if nothing is notable. Each alert must reference a specific category present in the data.`;

  const user = `Month: ${data.monthLabel} (day ${data.dayOfMonth} of ${data.daysInMonth})

Category spending vs baseline:
${categoryLines.join("\n") || "(no expense data)"}

Top individual transactions this month:
${topLines.join("\n") || "(none)"}`;

  return { system, user };
}

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user.householdId) {
      return NextResponse.json({ alerts: [] }, { status: 401 });
    }

    const { id: userId, householdId } = session.user;
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const cacheKey = `${householdId}:${year}-${String(month).padStart(2, "0")}`;

    const cached = anomalyCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < THROTTLE_MS) {
      return NextResponse.json({ alerts: cached.alerts, cached: true });
    }

    const data = await fetchAnomalyData(householdId, userId, month, year);
    const { system, user } = buildAnomalyPrompt(data);

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

    const validTypes = new Set(["overspend", "unusual_transaction", "budget_exceeded"]);
    const validSeverities = new Set(["warning", "critical"]);
    const knownCategories = new Set(
      data.currentTotals.map((c) => c.categoryName),
    );

    const alerts: AnomalyAlert[] = (raw.alerts ?? []).filter(
      (a): a is AnomalyAlert =>
        typeof a.type === "string" &&
        validTypes.has(a.type) &&
        typeof a.category === "string" &&
        knownCategories.has(a.category) &&
        typeof a.message === "string" &&
        typeof a.severity === "string" &&
        validSeverities.has(a.severity),
    );

    anomalyCache.set(cacheKey, { alerts, ts: Date.now() });

    return NextResponse.json({ alerts, cached: false });
  } catch (error) {
    console.error("[AI anomalies]", error);
    return NextResponse.json({ alerts: [] });
  }
}
