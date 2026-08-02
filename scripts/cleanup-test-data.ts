import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.LOCAL_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const isNeon = connectionString.includes("neon.tech");
console.log(`Connecting to ${isNeon ? "production (Neon)" : "local"} database for cleanup...`);

const pool = new Pool({
  connectionString,
  ssl: isNeon ? { rejectUnauthorized: false } : false,
});

async function cleanup() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Find test user IDs
    const userRes = await client.query(
      `SELECT id, name, email FROM users WHERE email LIKE 'e2e_user_%' OR name LIKE 'Test User%' OR name LIKE 'Updated Name E2E%'`
    );
    const testUserIds = userRes.rows.map((r) => r.id);
    console.log(`Found ${testUserIds.length} test users to delete.`);

    // Find test household IDs
    const householdRes = await client.query(
      `SELECT id, name FROM households WHERE name LIKE '%E2E%' OR name LIKE 'Test Household%' OR name LIKE 'New Household%' OR name LIKE 'My E2E Family%'`
    );
    const testHouseholdIds = householdRes.rows.map((r) => r.id);
    console.log(`Found ${testHouseholdIds.length} test households to delete.`);

    if (testUserIds.length > 0 || testHouseholdIds.length > 0) {
      const deleteTxRes = await client.query(
        `DELETE FROM transactions WHERE created_by = ANY($1::uuid[]) OR household_id = ANY($2::uuid[]) OR description LIKE '%E2E%' OR description LIKE '%Test Grocery%'`,
        [testUserIds, testHouseholdIds]
      );
      console.log(`Deleted ${deleteTxRes.rowCount} test transactions.`);

      const deleteDebtRes = await client.query(
        `DELETE FROM debts WHERE created_by = ANY($1::uuid[]) OR household_id = ANY($2::uuid[])`,
        [testUserIds, testHouseholdIds]
      );
      console.log(`Deleted ${deleteDebtRes.rowCount} test debts.`);

      const deleteCatRes = await client.query(
        `DELETE FROM categories WHERE created_by = ANY($1::uuid[]) OR household_id = ANY($2::uuid[]) OR name LIKE '%E2E%'`,
        [testUserIds, testHouseholdIds]
      );
      console.log(`Deleted ${deleteCatRes.rowCount} test categories.`);

      const deleteUploadsRes = await client.query(
        `DELETE FROM statement_uploads WHERE created_by = ANY($1::uuid[]) OR household_id = ANY($2::uuid[])`,
        [testUserIds, testHouseholdIds]
      );
      console.log(`Deleted ${deleteUploadsRes.rowCount} test statement uploads.`);
    }

    if (testUserIds.length > 0) {
      const deleteTokenRes = await client.query(
        `DELETE FROM refresh_tokens WHERE user_id = ANY($1::uuid[])`,
        [testUserIds]
      );
      console.log(`Deleted ${deleteTokenRes.rowCount} test refresh tokens.`);
    }

    if (testUserIds.length > 0 || testHouseholdIds.length > 0) {
      const deleteMembersRes = await client.query(
        `DELETE FROM household_members WHERE user_id = ANY($1::uuid[]) OR household_id = ANY($2::uuid[])`,
        [testUserIds, testHouseholdIds]
      );
      console.log(`Deleted ${deleteMembersRes.rowCount} test household members.`);
    }

    if (testUserIds.length > 0) {
      const deleteUsersRes = await client.query(
        `DELETE FROM users WHERE id = ANY($1::uuid[])`,
        [testUserIds]
      );
      console.log(`Deleted ${deleteUsersRes.rowCount} test users.`);
    }

    if (testHouseholdIds.length > 0) {
      const deleteHouseholdsRes = await client.query(
        `DELETE FROM households WHERE id = ANY($1::uuid[])`,
        [testHouseholdIds]
      );
      console.log(`Deleted ${deleteHouseholdsRes.rowCount} test households.`);
    }

    await client.query("COMMIT");
    console.log("Cleanup completed successfully! All test data deleted.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Cleanup failed, rolled back changes:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup();
