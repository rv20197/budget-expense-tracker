import { and, eq, gte, lte } from "drizzle-orm";

import { db } from "@/db";
import { categories, statementUploads, transactions } from "@/db/schema";
import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";
import {
  categorizeTransactions,
  type CategoryOption,
} from "@/lib/categorization/aiCategorizer";
import { parsePDF, type ParsedTransaction } from "@/lib/parsers/pdfParser";

// Vercel serverless functions are frozen after the response is sent, so
// background tasks (setImmediate, setTimeout) never execute. We process the
// PDF synchronously before responding. 120s covers large multi-page statements
// with multiple GPT-4o batches; requires Vercel Pro (Hobby cap is 10s).
export const maxDuration = 120;

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

  const { id: userId, householdId } = session.user as {
    id: string;
    householdId: string;
  };

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return badRequest("Invalid form data.");
  }

  const file = formData.get("file");
  const bankName = formData.get("bankName");

  if (!(file instanceof File)) return badRequest("file is required.");
  if (typeof bankName !== "string" || !bankName.trim()) {
    return badRequest("bankName is required.");
  }
  if (file.size > MAX_FILE_SIZE) {
    return badRequest("File too large. Maximum 15MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // Validate PDF magic bytes
  if (buffer.slice(0, 4).toString("ascii") !== "%PDF") {
    return badRequest("Invalid file type. Only PDF files are accepted.");
  }

  // Fetch household categories
  const householdCategories = await db
    .select({ id: categories.id, name: categories.name, type: categories.type })
    .from(categories)
    .where(eq(categories.householdId, householdId));

  if (householdCategories.length === 0) {
    return badRequest(
      "No categories found. Create at least one category before importing statements.",
    );
  }

  // Create upload record
  let uploadId: string;
  try {
    const [upload] = await db
      .insert(statementUploads)
      .values({
        householdId,
        createdBy: userId,
        fileName: file.name,
        fileSize: file.size,
        bankName: bankName.trim(),
        status: "processing",
      })
      .returning({ id: statementUploads.id });

    uploadId = upload.id;
  } catch {
    return serverError("Failed to create upload record.");
  }

  await processStatement(uploadId, buffer, householdId, userId, householdCategories);

  return ok({ uploadId }, 202);
}

async function processStatement(
  uploadId: string,
  buffer: Buffer,
  householdId: string,
  userId: string,
  householdCategories: CategoryOption[],
) {
  try {
    // 1. Parse PDF
    const parsed = await parsePDF(buffer);

    if (parsed.transactions.length === 0) {
      await db
        .update(statementUploads)
        .set({
          status: "failed",
          errorMessage:
            parsed.parsingWarnings[0] ??
            "Could not detect transaction data in this PDF.",
        })
        .where(eq(statementUploads.id, uploadId));
      return;
    }

    // 2. Deduplicate against existing transactions (±1 day window)
    const oneDayMs = 24 * 60 * 60 * 1000;
    const duplicates: ParsedTransaction[] = [];
    const nonDuplicates: ParsedTransaction[] = [];

    for (const txn of parsed.transactions) {
      const existing = await db
        .select({ id: transactions.id })
        .from(transactions)
        .where(
          and(
            eq(transactions.householdId, householdId),
            eq(transactions.amount, txn.amount.toFixed(2)),
            gte(
              transactions.transactionDate,
              new Date(txn.date.getTime() - oneDayMs),
            ),
            lte(
              transactions.transactionDate,
              new Date(txn.date.getTime() + oneDayMs),
            ),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        duplicates.push(txn);
      } else {
        nonDuplicates.push(txn);
      }
    }

    // 3. AI categorize non-duplicates
    const categorizationInputs = nonDuplicates.map((t) => ({
      description: t.description,
      type: t.type,
    }));

    const categorized = await categorizeTransactions(
      categorizationInputs,
      householdCategories,
    );

    // 4. Batch insert inside a transaction
    if (nonDuplicates.length > 0) {
      await db.transaction(async (tx) => {
        for (let i = 0; i < nonDuplicates.length; i++) {
          const txn = nonDuplicates[i];
          const cat = categorized[i];

          if (!cat.categoryId) continue; // no categories available

          await tx.insert(transactions).values({
            householdId,
            createdBy: userId,
            categoryId: cat.categoryId,
            type: txn.type === "credit" ? "income" : "expense",
            description: cat.merchantName || txn.description,
            amount: txn.amount.toFixed(2),
            transactionDate: txn.date,
            uploadId,
            rawDescription: txn.description,
            merchantName: cat.merchantName || null,
            confidenceScore: cat.confidence,
          });
        }
      });
    }

    // 5. Compute period
    const allDates = parsed.transactions.map((t) => t.date.getTime());
    const periodStart = new Date(Math.min(...allDates));
    const periodEnd = new Date(Math.max(...allDates));

    // 6. Mark upload as completed
    await db
      .update(statementUploads)
      .set({
        status: "completed",
        totalFound: parsed.transactions.length,
        duplicatesSkipped: duplicates.length,
        totalInserted: nonDuplicates.length,
        statementPeriodStart: periodStart,
        statementPeriodEnd: periodEnd,
      })
      .where(eq(statementUploads.id, uploadId));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    try {
      await db
        .update(statementUploads)
        .set({ status: "failed", errorMessage: message })
        .where(eq(statementUploads.id, uploadId));
    } catch {
      // ignore secondary failure
    }
  }
}
