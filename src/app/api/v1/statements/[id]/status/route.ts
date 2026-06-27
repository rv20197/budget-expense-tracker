import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { statementUploads } from "@/db/schema";
import { badRequest, notFound, ok, unauthorized } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

  const { id } = await params;

  const [upload] = await db
    .select({
      status: statementUploads.status,
      totalFound: statementUploads.totalFound,
      duplicatesSkipped: statementUploads.duplicatesSkipped,
      totalInserted: statementUploads.totalInserted,
      errorMessage: statementUploads.errorMessage,
    })
    .from(statementUploads)
    .where(
      and(
        eq(statementUploads.id, id),
        eq(statementUploads.householdId, session.user.householdId),
      ),
    )
    .limit(1);

  if (!upload) return notFound("Upload not found.");

  return ok(upload);
}
