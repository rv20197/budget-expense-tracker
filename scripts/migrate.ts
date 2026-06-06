import "dotenv/config";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function createDatabaseIfNotExists(connectionString: string) {
  if (!connectionString) {
    throw new Error("DATABASE_URL must be set.");
  }

  const url = new URL(connectionString);
  const databaseName = url.pathname?.slice(1);

  if (!databaseName) {
    throw new Error("DATABASE_URL must include a database name.");
  }

  const adminUrl = new URL(connectionString);
  adminUrl.pathname = "/postgres";

  const adminPool = new Pool({ connectionString: adminUrl.toString() });

  try {
    const client = await adminPool.connect();
    try {
      await client.query(`CREATE DATABASE "${databaseName}"`);
      console.log(`[migrate] Created database \"${databaseName}\".`);
    } catch (error: any) {
      if (error.code === "42P04") {
        console.log(`[migrate] Database \"${databaseName}\" already exists.`);
      } else {
        throw error;
      }
    } finally {
      client.release();
    }
  } finally {
    await adminPool.end();
  }
}

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  try {
    await createDatabaseIfNotExists(databaseUrl ?? "");
  } catch (error) {
    console.error("[migrate] Failed to create database:", error);
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const db = drizzle(pool);

  try {
    console.log("[migrate] Starting migrations...");
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
    console.log("[migrate] Migrations completed successfully.");
  } catch (error) {
    console.error("[migrate] Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
