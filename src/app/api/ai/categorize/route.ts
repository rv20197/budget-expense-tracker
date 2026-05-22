import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, or } from "drizzle-orm";

import { openai } from "@/lib/ai/openai";
import { getSession } from "@/lib/auth/session";
import { db } from "@/db";
import { categories } from "@/db/schema";

const requestSchema = z.object({
  description: z.string().min(1),
  amount: z.union([z.number(), z.string()]).optional(),
  type: z.enum(["income", "expense"]).default("expense"),
});

type AiRaw = {
  category?: string;
  confidence?: string;
  reason?: string;
};

type CategorizeSuggestion = {
  categoryId: string;
  categoryName: string;
  confidence: "high" | "medium" | "low";
  reason: string;
};

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user.householdId) {
      return NextResponse.json({ suggestion: null }, { status: 401 });
    }

    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ suggestion: null });
    }

    const { description, amount, type } = parsed.data;
    const { id: userId, householdId } = session.user;

    const rows = await db
      .select({ id: categories.id, name: categories.name })
      .from(categories)
      .where(
        and(
          eq(categories.householdId, householdId),
          eq(categories.type, type),
          or(
            eq(categories.scope, "household"),
            and(eq(categories.scope, "personal"), eq(categories.createdBy, userId)),
          ),
        ),
      );

    if (rows.length === 0) {
      return NextResponse.json({ suggestion: null });
    }

    const categoryList = rows.map((c) => c.name).join(", ");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a financial categorization assistant. Given a transaction description and optional amount, suggest the best matching category from the list provided.

Return ONLY this JSON shape:
{
  "category": "<exact name from the list>",
  "confidence": "high" | "medium" | "low",
  "reason": "<one sentence explanation>"
}

Available categories: ${categoryList}

Rules:
- "category" must be an exact name from the list above — never invent one
- "confidence": "high" if the match is obvious, "medium" if reasonable, "low" if uncertain
- Pick the closest category even when confidence is low`,
        },
        {
          role: "user",
          content: `Description: "${description}"${amount ? `\nAmount: ${amount}` : ""}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const raw = JSON.parse(
      response.choices[0].message.content ?? "{}",
    ) as AiRaw;

    const matched = rows.find((c) => c.name === raw.category);
    const confidence = raw.confidence;

    if (
      !matched ||
      !confidence ||
      (confidence !== "high" && confidence !== "medium" && confidence !== "low") ||
      !raw.reason
    ) {
      return NextResponse.json({ suggestion: null });
    }

    const suggestion: CategorizeSuggestion = {
      categoryId: matched.id,
      categoryName: matched.name,
      confidence,
      reason: raw.reason,
    };

    return NextResponse.json({ suggestion });
  } catch (error) {
    console.error("[AI categorize]", error);
    return NextResponse.json({ suggestion: null });
  }
}
