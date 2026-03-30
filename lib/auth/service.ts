import "server-only";

import crypto from "node:crypto";

import { SignJWT } from "jose";
import { and, eq, gt } from "drizzle-orm";

import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { db } from "@/lib/db";
import {
  categories,
  refreshTokens,
  users,
  type categoryTypeEnum,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { comparePassword, hashPassword } from "@/lib/auth/hash";
import { checkRateLimit, resetRateLimit } from "@/lib/auth/rate-limit";
import { verifyToken } from "@/lib/auth/verify-token";
import type { LoginInput, RegisterInput } from "@/lib/validations/auth.schemas";

type CategoryType = (typeof categoryTypeEnum.enumValues)[number];

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
    name: user.name,
    type: "access",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
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

async function seedDefaultCategories(userId: string) {
  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map((category) => ({
      userId,
      name: category.name,
      type: category.type as CategoryType,
      color: category.color,
      isDefault: true,
    })),
  );
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

  await seedDefaultCategories(createdUser.id);

  const tokens = await createTokenBundle({
    id: createdUser.id,
    name: createdUser.name,
    email: createdUser.email,
  });

  return {
    success: true as const,
    user: createdUser,
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

  const tokens = await createTokenBundle({
    id: user.id,
    name: user.name,
    email: user.email,
  });

  return {
    success: true as const,
    user,
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

  const tokens = await createTokenBundle({
    id: user.id,
    name: user.name,
    email: user.email,
  });

  return {
    user,
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
