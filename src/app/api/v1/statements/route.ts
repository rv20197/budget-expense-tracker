import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { statementUploads } from "@/db/schema";
import { badRequest, ok, unauthorized } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

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
    .where(
      and(
        eq(statementUploads.householdId, session.user.householdId),
      ),
    )
    .orderBy(desc(statementUploads.createdAt));

  return ok(
    uploads.map((u) => ({
      ...u,
      statementPeriodStart: u.statementPeriodStart
        ? u.statementPeriodStart instanceof Date
          ? u.statementPeriodStart.toISOString().slice(0, 10)
          : String(u.statementPeriodStart)
        : null,
      statementPeriodEnd: u.statementPeriodEnd
        ? u.statementPeriodEnd instanceof Date
          ? u.statementPeriodEnd.toISOString().slice(0, 10)
          : String(u.statementPeriodEnd)
        : null,
      createdAt: u.createdAt instanceof Date
        ? u.createdAt.toISOString()
        : String(u.createdAt),
    })),
  );
}
