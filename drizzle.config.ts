import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs standalone (not through Next.js, which loads
// .env.local itself), so load it explicitly here. Does nothing (silently)
// if the file doesn't exist yet, e.g. before the user has copied
// .env.local.example — real process env vars (CI, shell exports) are
// never overridden by this.
loadEnv({ path: ".env.local" });

// DDL (migrations, RLS policy setup) needs the elevated/trusted role, never
// the restricted app_user connection — see scripts/setup-app-role.ts and
// db/client.ts for why the two are kept separate.
const databaseUrl =
  process.env.DATABASE_TRUSTED_URL ?? process.env.DATABASE_URL;

// `generate` diffs the local schema against db/migrations/ and needs no DB
// connection at all, so don't hard-fail just because DATABASE_URL isn't
// set yet — only `migrate`/`push`/`introspect`/`studio` need it, and
// drizzle-kit itself will raise a clear error for those if it's missing.
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
  strict: true,
  verbose: true,
});
