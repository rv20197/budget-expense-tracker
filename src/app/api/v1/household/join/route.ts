import { eq } from "drizzle-orm";

import { db } from "@/db";
import { householdMembers, households } from "@/db/schema";
import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";
import { issueTokensForUser } from "@/lib/auth/service";

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();

  if (session.user.householdId) {
    return badRequest("You are already in a household.");
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const inviteCode = (body?.inviteCode ?? "").trim().toUpperCase();
    if (!inviteCode) return badRequest("Invite code is required.");

    const [household] = await db
      .select()
      .from(households)
      .where(eq(households.inviteCode, inviteCode))
      .limit(1);

    if (!household) return badRequest("Invalid invite code.");

    await db.insert(householdMembers).values({
      householdId: household.id,
      role: "member",
      userId,
    });

    const tokens = await issueTokensForUser(userId);

    return ok({
      household,
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        accessExpiresAt: tokens.accessExpiresAt.toISOString(),
        refreshExpiresAt: tokens.refreshExpiresAt.toISOString(),
      },
    });
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
}
