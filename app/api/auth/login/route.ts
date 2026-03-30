import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { setAuthCookies } from "@/lib/auth/cookies";
import { loginUser } from "@/lib/auth/service";
import { validationError } from "@/lib/action-helpers";
import { loginSchema } from "@/lib/validations/auth.schemas";

async function getRequestIp() {
  const headerStore = await headers();

  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headerStore.get("x-real-ip") ??
    "127.0.0.1"
  );
}

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    const result = await loginUser(payload, await getRequestIp());

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      data: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
    });

    setAuthCookies(
      response.cookies,
      result.tokens.accessToken,
      result.tokens.refreshToken,
      result.tokens.accessExpiresAt,
      result.tokens.refreshExpiresAt,
    );

    return response;
  } catch (error) {
    return NextResponse.json(
      error instanceof ZodError
        ? validationError(error)
        : { success: false, error: "Unable to sign in." },
      { status: 400 },
    );
  }
}
