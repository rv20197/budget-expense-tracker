import { NextResponse, type NextRequest } from "next/server";

import { ACCESS_COOKIE_NAME } from "@/lib/auth/cookies";
import { env } from "@/lib/env";
import { verifyToken } from "@/lib/auth/jwt";
import { logger } from "@/lib/logger";

const protectedPaths = [
  "/dashboard",
  "/transactions",
  "/categories",
  "/budgets",
  "/recurring",
  "/reports",
  "/settings",
  "/statements",
];

const authPaths = ["/login", "/register"];
const onboardingPath = "/onboarding";

function isProtectedPath(pathname: string) {
  return protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

function isAuthPath(pathname: string) {
  return authPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isOnboardingPath(pathname: string) {
  return pathname === onboardingPath || pathname.startsWith(`${onboardingPath}/`);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  let hasValidSession = false;
  let householdId: string | null = null;

  if (accessToken) {
    try {
      const payload = await verifyToken<{ householdId?: string | null; type: "access" }>(
        accessToken,
        env.JWT_ACCESS_SECRET,
      );

      hasValidSession = payload.type === "access";
      householdId = payload.householdId ?? null;
      logger.debug("Middleware", `Valid session token verified for path: ${pathname}`, { householdId });
    } catch (err) {
      hasValidSession = false;
      logger.warn("Middleware", `Token verification failed for path: ${pathname}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  } else {
    logger.debug("Middleware", `No access token cookie present for path: ${pathname}`);
  }

  if (isProtectedPath(pathname) && !hasValidSession) {
    logger.info("Middleware", `Unauthenticated request to protected path ${pathname}. Redirecting to /login.`);
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasValidSession && isProtectedPath(pathname) && !householdId) {
    logger.info("Middleware", `Authenticated user with no household on ${pathname}. Redirecting to /onboarding.`);
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (isOnboardingPath(pathname) && !hasValidSession) {
    logger.info("Middleware", `Unauthenticated request to onboarding path. Redirecting to /login.`);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isOnboardingPath(pathname) && householdId) {
    logger.info("Middleware", `Authenticated user with household on onboarding. Redirecting to /dashboard.`);
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isAuthPath(pathname) && hasValidSession) {
    const target = householdId ? "/dashboard" : "/onboarding";
    logger.info("Middleware", `Authenticated user accessing auth path ${pathname}. Redirecting to ${target}.`);
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/categories/:path*",
    "/budgets/:path*",
    "/recurring/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/statements/:path*",
    "/onboarding/:path*",
    "/login",
    "/register",
  ],
};
