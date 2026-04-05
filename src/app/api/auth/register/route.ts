import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { clearAuthCookies, setAuthCookies } from "@/lib/auth/cookies";
import { registerUser } from "@/lib/auth/service";
import { validationError } from "@/lib/action-helpers";
import { registerSchema } from "@/features/auth/schemas/auth.schemas";

export async function POST(request: Request) {
  try {
    const payload = registerSchema.parse(await request.json());
    const result = await registerUser(payload);

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
    const response = NextResponse.json(
      error instanceof ZodError
        ? validationError(error)
        : { success: false, error: "Unable to create account." },
      { status: 400 },
    );

    clearAuthCookies(response.cookies);

    return response;
  }
}
