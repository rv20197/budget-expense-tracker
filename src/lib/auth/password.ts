import bcrypt from "bcryptjs";

import { env } from "@/lib/env";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
