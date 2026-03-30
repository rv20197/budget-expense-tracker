"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ZodError } from "zod";

import { unexpectedError, validationError } from "@/lib/action-helpers";
import { clearAuthCookies } from "@/lib/auth/cookies";
import { comparePassword, hashPassword } from "@/lib/auth/hash";
import { getSession } from "@/lib/auth/session";
import { revokeAllUserRefreshTokens } from "@/lib/auth/service";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { ActionResult } from "@/lib/types/actions";
import { deleteAccountSchema } from "@/lib/validations/finance.schemas";
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from "@/lib/validations/auth.schemas";

async function requireSession() {
  return getSession();
}

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<ActionResult<{ id: string }, Extract<keyof UpdateProfileInput, string>>> {
  const session = await requireSession();

  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

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

    return { success: true, data: updatedUser };
  } catch (error) {
    return error instanceof ZodError
      ? validationError<Extract<keyof UpdateProfileInput, string>>(error)
      : unexpectedError("Unable to update profile.");
  }
}

export async function changePassword(
  input: ChangePasswordInput,
): Promise<ActionResult<{ id: string }, Extract<keyof ChangePasswordInput, string>>> {
  const session = await requireSession();

  if (!session) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const payload = changePasswordSchema.parse(input);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      return { success: false, error: "User not found." };
    }

    const isCurrentPasswordValid = await comparePassword(
      payload.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
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

    return { success: true, data: { id: session.user.id } };
  } catch (error) {
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
    return { success: false, error: "Unauthorized." };
  }

  try {
    deleteAccountSchema.parse({ confirmation });

    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.id, session.user.id))
      .returning({ id: users.id });

    if (!deletedUser) {
      return { success: false, error: "Account not found." };
    }

    const cookieStore = await cookies();
    clearAuthCookies(cookieStore);
    revalidatePath("/");

    return { success: true, data: deletedUser };
  } catch (error) {
    return error instanceof ZodError
      ? validationError<"confirmation">(error)
      : unexpectedError("Unable to delete account.");
  }
}
