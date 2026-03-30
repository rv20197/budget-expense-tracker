import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

declare global {
  var __budgetTrackerPool: Pool | undefined;
}

const pool =
  globalThis.__budgetTrackerPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: env.NODE_ENV === "development" ? 10 : 20,
    ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

if (env.NODE_ENV !== "production") {
  globalThis.__budgetTrackerPool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
