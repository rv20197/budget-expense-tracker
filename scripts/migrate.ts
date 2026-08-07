import "dotenv/config";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { logger } from "../src/lib/logger";

async function createDatabaseIfNotExists(connectionString: string) {
  if (!connectionString) {
    throw new Error("DATABASE_URL must be set.");
  }

  try {
    const url = new URL(connectionString);
    const databaseName = url.pathname?.slice(1);

    if (!databaseName) {
      return;
    }

    const adminUrl = new URL(connectionString);
    adminUrl.pathname = "/postgres";

    const adminPool = new Pool({ connectionString: adminUrl.toString() });

    try {
      const client = await adminPool.connect();
      try {
        await client.query(`CREATE DATABASE "${databaseName}"`);
        logger.info("MigrateScript", `Created database "${databaseName}"`);
      } catch (error: any) {
        if (error.code === "42P04") {
          logger.info("MigrateScript", `Database "${databaseName}" already exists`);
        } else {
          logger.warn("MigrateScript", `Admin database check skipped: ${error.message}`);
        }
      } finally {
        client.release();
      }
    } finally {
      await adminPool.end();
    }
  } catch (error: any) {
    logger.warn("MigrateScript", `Skipping admin database check: ${error.message}`);
  }
}

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;

  try {
    await createDatabaseIfNotExists(databaseUrl ?? "");
  } catch (error) {
    logger.error("MigrateScript", "Failed to check or create database", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  const db = drizzle(pool);

  try {
    logger.info("MigrateScript", "Starting migrations...");
    await migrate(db, { migrationsFolder: "./src/db/migrations" });
    logger.info("MigrateScript", "Migrations completed successfully.");
  } catch (error) {
    logger.error("MigrateScript", "Migration execution failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
