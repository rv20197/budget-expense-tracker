import { jwtVerify, type JWTPayload } from "jose";

export async function verifyToken<TPayload extends JWTPayload>(
  token: string,
  secret: string,
) {
  const verified = await jwtVerify<TPayload>(
    token,
    new TextEncoder().encode(secret),
  );

  return verified.payload;
}
