import { and, eq, gte, lte } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { categories, transactions } from "@/db/schema";
import { getAuthContext } from "@/lib/auth/getUser";

export async function GET(request: Request) {
  const session = await getAuthContext().catch(() => null);

  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const conditions = [eq(transactions.householdId, session.householdId)];

  if (from) {
    conditions.push(gte(transactions.transactionDate, new Date(from)));
  }

  if (to) {
    conditions.push(lte(transactions.transactionDate, new Date(to)));
  }

  const rows = await db
    .select({
      date: transactions.transactionDate,
      description: transactions.description,
      amount: transactions.amount,
      type: transactions.type,
      category: categories.name,
      notes: transactions.notes,
    })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(...conditions));

  const csvLines = [
    "date,description,amount,type,category,notes",
    ...rows.map((row) =>
      [
        row.date.toISOString().slice(0, 10),
        row.description,
        row.amount,
        row.type,
        row.category,
        row.notes ?? "",
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    ),
  ];

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(csvLines.join("\n")));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="transactions.csv"',
    },
  });
}
