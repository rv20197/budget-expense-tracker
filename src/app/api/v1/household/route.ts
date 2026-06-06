import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/db";
import {
  categories,
  householdMembers,
  households,
  users,
} from "@/db/schema";
import { badRequest, ok, serverError, unauthorized } from "@/lib/api-response";
import { getSessionFromRequest } from "@/lib/auth/getSessionFromRequest";
import { issueTokensForUser } from "@/lib/auth/service";
import { DEFAULT_CATEGORIES } from "@/lib/constants";

async function generateInviteCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = nanoid(8).toUpperCase();
    const [existing] = await db
      .select({ id: households.id })
      .from(households)
      .where(eq(households.inviteCode, code))
      .limit(1);
    if (!existing) return code;
  }
  throw new Error("Unable to generate invite code.");
}

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();
  if (!session.user.householdId) return badRequest("No household found.");

  const householdId = session.user.householdId;

  const [household, members] = await Promise.all([
    db
      .select()
      .from(households)
      .where(eq(households.id, householdId))
      .limit(1),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: householdMembers.role,
        joinedAt: householdMembers.joinedAt,
      })
      .from(householdMembers)
      .innerJoin(users, eq(householdMembers.userId, users.id))
      .where(eq(householdMembers.householdId, householdId)),
  ]);

  return ok({ household: household[0] ?? null, members });
}

export async function POST(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) return unauthorized();

  if (session.user.householdId) {
    return badRequest("You are already in a household.");
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const name = (body?.name ?? "").trim();
    if (!name) return badRequest("Household name is required.");

    const inviteCode = await generateInviteCode();

    const household = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(households)
        .values({ name, inviteCode })
        .returning();

      await tx.insert(householdMembers).values({
        householdId: created.id,
        role: "admin",
        userId,
      });

      await tx.insert(categories).values(
        DEFAULT_CATEGORIES.map((cat) => ({
          householdId: created.id,
          createdBy: userId,
          scope: "household" as const,
          name: cat.name,
          type: cat.type,
          color: cat.color,
          isDefault: true,
        })),
      );

      return created;
    });

    const tokens = await issueTokensForUser(userId);

    return ok(
      {
        household,
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          accessExpiresAt: tokens.accessExpiresAt.toISOString(),
          refreshExpiresAt: tokens.refreshExpiresAt.toISOString(),
        },
      },
      201,
    );
  } catch (error) {
    return serverError(error instanceof Error ? error.message : undefined);
  }
}
