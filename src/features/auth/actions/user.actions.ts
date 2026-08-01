"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ZodError } from "zod";

import { unexpectedError, validationError } from "@/lib/action-helpers";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { comparePassword, hashPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";
import { revokeAllUserRefreshTokens } from "@/lib/auth/service";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { ActionResult } from "@/lib/types/actions";
import { deleteAccountSchema } from "@/features/transactions/schemas/finance.schemas";
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from "@/features/auth/schemas/auth.schemas";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";
import { logger } from "@/lib/logger";

async function requireSession() {
  return getSession();
}

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<ActionResult<{ id: string }, Extract<keyof UpdateProfileInput, string>>> {
  const session = await requireSession();

  if (!session) {
    logger.warn("UserActions", "updateProfile rejected: Unauthorized");
    return { success: false, error: "Unauthorized." };
  }

  logger.info("UserActions", `Updating profile for user: ${session.user.id}`, input);

  try {
    const payload = updateProfileSchema.parse(input);
    const [updatedUser] = await db
      .update(users)
      .set({
        name: payload.name,
        email: payload.email.toLowerCase(),
      })
      .where(eq(users.id, session.user.id))
      .returning({ id: users.id });

    revalidatePath("/settings");
    revalidatePath("/dashboard");

    logger.info("UserActions", `Profile updated successfully for user: ${session.user.id}`);
    return { success: true, data: updatedUser };
  } catch (error) {
    logger.error("UserActions", `Error updating profile for user: ${session.user.id}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return error instanceof ZodError
      ? validationError<Extract<keyof UpdateProfileInput, string>>(error)
      : unexpectedError("Unable to update profile.");
  }
}

export async function updateCurrency(
  currency: string,
): Promise<ActionResult<{ currency: string }>> {
  const session = await requireSession();

  if (!session) {
    logger.warn("UserActions", "updateCurrency rejected: Unauthorized");
    return { success: false, error: "Unauthorized." };
  }

  logger.info("UserActions", `Updating currency to ${currency} for user: ${session.user.id}`);

  if (!SUPPORTED_CURRENCIES[currency]) {
    logger.warn("UserActions", `Invalid currency requested: ${currency}`);
    return { success: false, error: "Invalid currency selected." };
  }

  try {
    await db
      .update(users)
      .set({ currency })
      .where(eq(users.id, session.user.id));

    const cookieStore = await cookies();
    cookieStore.set("currency_pref", currency, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });

    revalidatePath("/settings");
    revalidatePath("/dashboard");
    revalidatePath("/transactions");
    revalidatePath("/debt");

    logger.info("UserActions", `Currency updated to ${currency} for user: ${session.user.id}`);
    return { success: true, data: { currency } };
  } catch (error) {
    logger.error("UserActions", `Error updating currency for user: ${session.user.id}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return unexpectedError(error instanceof Error ? error.message : "Unable to update currency preference.");
  }
}

export async function changePassword(
  input: ChangePasswordInput,
): Promise<ActionResult<{ id: string }, Extract<keyof ChangePasswordInput, string>>> {
  const session = await requireSession();

  if (!session) {
    logger.warn("UserActions", "changePassword rejected: Unauthorized");
    return { success: false, error: "Unauthorized." };
  }

  logger.info("UserActions", `Password change requested for user: ${session.user.id}`);

  try {
    const payload = changePasswordSchema.parse(input);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      logger.warn("UserActions", `User not found: ${session.user.id}`);
      return { success: false, error: "User not found." };
    }

    const isCurrentPasswordValid = await comparePassword(
      payload.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      logger.warn("UserActions", `Current password incorrect for user: ${session.user.id}`);
      return {
        success: false,
        error: "Current password is incorrect.",
        fieldErrors: {
          currentPassword: ["Current password is incorrect."],
        },
      };
    }

    const passwordHash = await hashPassword(payload.newPassword);

    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, session.user.id));

    await revokeAllUserRefreshTokens(session.user.id);
    revalidatePath("/settings");

    logger.info("UserActions", `Password changed successfully for user: ${session.user.id}`);
    return { success: true, data: { id: session.user.id } };
  } catch (error) {
    logger.error("UserActions", `Error changing password for user: ${session.user.id}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return error instanceof ZodError
      ? validationError<Extract<keyof ChangePasswordInput, string>>(error)
      : unexpectedError("Unable to change password.");
  }
}

export async function deleteAccount(
  confirmation: string,
): Promise<ActionResult<{ id: string }, "confirmation">> {
  const session = await requireSession();

  if (!session) {
    logger.warn("UserActions", "deleteAccount rejected: Unauthorized");
    return { success: false, error: "Unauthorized." };
  }

  logger.info("UserActions", `Account deletion requested for user: ${session.user.id}`);

  try {
    deleteAccountSchema.parse({ confirmation });

    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.id, session.user.id))
      .returning({ id: users.id });

    if (!deletedUser) {
      logger.warn("UserActions", `Account deletion failed, user not found: ${session.user.id}`);
      return { success: false, error: "Account not found." };
    }

    const cookieStore = await cookies();
    clearAuthCookies(cookieStore);
    revalidatePath("/");

    logger.info("UserActions", `Account deleted successfully: ${session.user.id}`);
    return { success: true, data: deletedUser };
  } catch (error) {
    logger.error("UserActions", `Error deleting account: ${session.user.id}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return error instanceof ZodError
      ? validationError<"confirmation">(error)
      : unexpectedError("Unable to delete account.");
  }
}
