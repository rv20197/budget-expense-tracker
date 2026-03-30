"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ZodError } from "zod";

import { validationError, unexpectedError } from "@/lib/action-helpers";
import { clearAuthCookies, REFRESH_COOKIE_NAME, setAuthCookies } from "@/lib/auth/cookies";
import { loginUser, logoutUser, registerUser } from "@/lib/auth/service";
import type { ActionResult } from "@/lib/types/actions";
import {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validations/auth.schemas";

export async function registerAction(
  input: RegisterInput,
): Promise<ActionResult<{ redirectTo: string }, keyof RegisterInput>> {
  try {
    const payload = registerSchema.parse(input);
    const result = await registerUser(payload);

    if (!result.success) {
      return result;
    }

    const cookieStore = await cookies();
    setAuthCookies(
      cookieStore,
      result.tokens.accessToken,
      result.tokens.refreshToken,
      result.tokens.accessExpiresAt,
      result.tokens.refreshExpiresAt,
    );

    return {
      success: true,
      data: {
        redirectTo: "/dashboard",
      },
    };
  } catch (error) {
    return error instanceof ZodError
      ? validationError<keyof RegisterInput>(error)
      : unexpectedError();
  }
}

export async function loginAction(
  input: LoginInput,
): Promise<ActionResult<{ redirectTo: string }, keyof LoginInput>> {
  try {
    const payload = loginSchema.parse(input);
    const result = await loginUser(payload, "server-action");

    if (!result.success) {
      return result;
    }

    const cookieStore = await cookies();
    setAuthCookies(
      cookieStore,
      result.tokens.accessToken,
      result.tokens.refreshToken,
      result.tokens.accessExpiresAt,
      result.tokens.refreshExpiresAt,
    );

    return {
      success: true,
      data: {
        redirectTo: "/dashboard",
      },
    };
  } catch (error) {
    return error instanceof ZodError
      ? validationError<keyof LoginInput>(error)
      : unexpectedError("Unable to sign in.");
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;

  await logoutUser(refreshToken);
  clearAuthCookies(cookieStore);

  redirect("/login");
}
