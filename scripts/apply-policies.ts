/**
 * Applies every .sql file in db/policies/, in filename order, against
 * DATABASE_TRUSTED_URL (falling back to DATABASE_URL). Intended to run
 * right after `drizzle-kit migrate` — see the `db:migrate` script in
 * package.json. Needs the elevated/trusted role: ENABLE/FORCE ROW LEVEL
 * SECURITY and CREATE POLICY are DDL, which the restricted app_user role
 * (see scripts/setup-app-role.ts) has no privilege to run.
 *
 * Each file is expected to be idempotent (see db/policies/README.md), so
 * this is safe to run repeatedly, including against a database that
 * already has every policy applied.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import postgres from "postgres";

// Standalone script, not run through Next.js — load .env.local explicitly.
loadEnv({ path: join(__dirname, "..", ".env.local") });

async function main() {
  const databaseUrl =
    process.env.DATABASE_TRUSTED_URL ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_TRUSTED_URL (or DATABASE_URL) is not set. Copy " +
        ".env.local.example to .env.local and fill in your Supabase " +
        "connection string before running this script.",
    );
  }

  const policiesDir = join(__dirname, "..", "db", "policies");
  const files = readdirSync(policiesDir)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // filenames are zero-padded, so lexicographic == numeric order

  if (files.length === 0) {
    console.log(`No .sql files found in ${policiesDir}, nothing to apply.`);
    return;
  }

  const sql = postgres(databaseUrl, { max: 1 });

  try {
    for (const file of files) {
      const fullPath = join(policiesDir, file);
      const statement = readFileSync(fullPath, "utf8");
      console.log(`Applying ${file} ...`);
      await sql.unsafe(statement);
      console.log(`  ok`);
    }
    console.log(`Applied ${files.length} policy file(s).`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("apply-policies failed:", err);
  process.exit(1);
});
