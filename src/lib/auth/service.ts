import "server-only";

import crypto from "node:crypto";

import { SignJWT } from "jose";
import { and, eq, gt } from "drizzle-orm";

import { db } from "@/db";
import {
  householdMembers,
  refreshTokens,
  users,
} from "@/db/schema";
import { env } from "@/lib/env";
import { comparePassword, hashPassword } from "@/lib/auth/password";
import { checkRateLimit, resetRateLimit } from "@/lib/auth/rate-limit";
import { verifyToken } from "@/lib/auth/jwt";
import type { LoginInput, RegisterInput } from "@/features/auth/schemas/auth.schemas";

type TokenBundle = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
};

type SessionUser = {
  id: string;
  name: string;
  email: string;
  householdId: string | null;
};

type RefreshTokenPayload = {
  sub: string;
  jti: string;
  type: "refresh";
};

function getExpiryDate(duration: string) {
  const match = duration.match(/^(\d+)([mhd])$/);

  if (!match) {
    throw new Error(`Unsupported duration: ${duration}`);
  }

  const value = Number(match[1]);
  const unit = match[2];
  const date = new Date();

  if (unit === "m") {
    date.setMinutes(date.getMinutes() + value);
  }

  if (unit === "h") {
    date.setHours(date.getHours() + value);
  }

  if (unit === "d") {
    date.setDate(date.getDate() + value);
  }

  return date;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function signAccessToken(user: SessionUser) {
  const expiresAt = getExpiryDate(env.ACCESS_TOKEN_EXPIRES_IN);
  const token = await new SignJWT({
    email: user.email,
    householdId: user.householdId,
    name: user.name,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .setAudience("budget-expense-tracker")
    .setIssuer("budget-expense-tracker")
    .sign(new TextEncoder().encode(env.JWT_ACCESS_SECRET));

  return {
    token,
    expiresAt,
  };
}

async function signRefreshToken(userId: string) {
  const expiresAt = getExpiryDate(env.REFRESH_TOKEN_EXPIRES_IN);
  const token = await new SignJWT({
    type: "refresh",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(new TextEncoder().encode(env.JWT_REFRESH_SECRET));

  return {
    token,
    expiresAt,
  };
}

async function createTokenBundle(user: SessionUser): Promise<TokenBundle> {
  const access = await signAccessToken(user);
  const refresh = await signRefreshToken(user.id);

  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash: hashToken(refresh.token),
    expiresAt: refresh.expiresAt,
  });

  return {
    accessToken: access.token,
    refreshToken: refresh.token,
    accessExpiresAt: access.expiresAt,
    refreshExpiresAt: refresh.expiresAt,
  };
}

async function getUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  return user ?? null;
}

async function getHouseholdIdForUser(userId: string) {
  const [membership] = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(eq(householdMembers.userId, userId))
    .limit(1);

  return membership?.householdId ?? null;
}

async function buildSessionUser(userId: string): Promise<SessionUser> {
  const [user, householdId] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    getHouseholdIdForUser(userId),
  ]);

  if (!user[0]) {
    throw new Error("User not found.");
  }

  return {
    id: user[0].id,
    name: user[0].name,
    email: user[0].email,
    householdId,
  };
}

export async function issueTokensForUser(userId: string) {
  const user = await buildSessionUser(userId);
  return createTokenBundle(user);
}

export async function registerUser(input: RegisterInput) {
  const existingUser = await getUserByEmail(input.email);

  if (existingUser) {
    return {
      success: false as const,
      error: "An account with that email already exists.",
      fieldErrors: {
        email: ["An account with that email already exists."],
      },
    };
  }

  const passwordHash = await hashPassword(input.password);

  const [createdUser] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
    })
    .returning();
  const tokens = await createTokenBundle({
    id: createdUser.id,
    name: createdUser.name,
    email: createdUser.email,
    householdId: null,
  });

  return {
    success: true as const,
    user: {
      ...createdUser,
      householdId: null,
    },
    tokens,
  };
}

export async function loginUser(input: LoginInput, ipAddress: string) {
  const rateLimit = checkRateLimit(ipAddress);

  if (!rateLimit.success) {
    return {
      success: false as const,
      error: "Too many login attempts. Please try again later.",
      retryAfterMs: rateLimit.retryAfterMs,
    };
  }

  const user = await getUserByEmail(input.email);

  if (!user) {
    return {
      success: false as const,
      error: "Invalid email or password.",
    };
  }

  const isPasswordValid = await comparePassword(input.password, user.passwordHash);

  if (!isPasswordValid) {
    return {
      success: false as const,
      error: "Invalid email or password.",
    };
  }

  resetRateLimit(ipAddress);

  const householdId = await getHouseholdIdForUser(user.id);
  const tokens = await createTokenBundle({
    id: user.id,
    name: user.name,
    email: user.email,
    householdId,
  });

  return {
    success: true as const,
    user: {
      ...user,
      householdId,
    },
    tokens,
  };
}

export async function refreshUserSession(refreshToken: string) {
  const payload = await verifyToken<RefreshTokenPayload>(
    refreshToken,
    env.JWT_REFRESH_SECRET,
  );

  if (payload.type !== "refresh" || !payload.sub) {
    throw new Error("Invalid refresh token.");
  }

  const tokenHash = hashToken(refreshToken);
  const [tokenRecord] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        eq(refreshTokens.userId, payload.sub),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!tokenRecord) {
    throw new Error("Refresh token not found.");
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  if (!user) {
    throw new Error("User not found.");
  }

  await db.delete(refreshTokens).where(eq(refreshTokens.id, tokenRecord.id));

  const tokens = await issueTokensForUser(user.id);

  return {
    user: {
      ...user,
      householdId: await getHouseholdIdForUser(user.id),
    },
    tokens,
  };
}

export async function logoutUser(refreshToken: string | null | undefined) {
  if (!refreshToken) {
    return;
  }

  await db
    .delete(refreshTokens)
    .where(eq(refreshTokens.tokenHash, hashToken(refreshToken)));
}

export async function revokeAllUserRefreshTokens(userId: string) {
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}
