import { env } from "@/lib/env";

type CookieSetter = {
  set: (
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: "lax";
      path: string;
      expires: Date;
    },
  ) => unknown;
};

const sharedOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const ACCESS_COOKIE_NAME = "accessToken";
export const REFRESH_COOKIE_NAME = "refreshToken";

export function setAuthCookies(
  cookieStore: CookieSetter,
  accessToken: string,
  refreshToken: string,
  accessExpiresAt: Date,
  refreshExpiresAt: Date,
) {
  cookieStore.set(ACCESS_COOKIE_NAME, accessToken, {
    ...sharedOptions,
    expires: accessExpiresAt,
  });

  cookieStore.set(REFRESH_COOKIE_NAME, refreshToken, {
    ...sharedOptions,
    expires: refreshExpiresAt,
  });
}

export function clearAuthCookies(cookieStore: CookieSetter) {
  const expiredAt = new Date(0);

  cookieStore.set(ACCESS_COOKIE_NAME, "", {
    ...sharedOptions,
    expires: expiredAt,
  });

  cookieStore.set(REFRESH_COOKIE_NAME, "", {
    ...sharedOptions,
    expires: expiredAt,
  });
}
