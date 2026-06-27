import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { statementUploads, transactions } from "@/db/schema";
import { badRequest, notFound, ok, unauthorized } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

  const { id } = await params;
  const householdId = session.user.householdId;

  // Verify ownership
  const [upload] = await db
    .select({ id: statementUploads.id })
    .from(statementUploads)
    .where(
      and(
        eq(statementUploads.id, id),
        eq(statementUploads.householdId, householdId),
      ),
    )
    .limit(1);

  if (!upload) return notFound("Upload not found.");

  // Null out upload_id on associated transactions (preserves user data)
  // then delete the upload record
  await db.transaction(async (tx) => {
    await tx
      .update(transactions)
      .set({ uploadId: null })
      .where(eq(transactions.uploadId, id));

    await tx
      .delete(statementUploads)
      .where(eq(statementUploads.id, id));
  });

  return ok({ id });
}
