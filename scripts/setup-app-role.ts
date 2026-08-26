import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { config as loadEnv } from "dotenv";
import postgres from "postgres";

/**
 * Creates (or repairs the grants on) a dedicated, RLS-respecting Postgres
 * role for the app to connect as at runtime.
 *
 * Why this exists: Supabase's default `postgres` role has `rolbypassrls =
 * true` — RLS policies (even with FORCE ROW LEVEL SECURITY) never apply to
 * it, or to any other role with BYPASSRLS/superuser. If the app connects
 * as `postgres`, every tenant-isolation policy in db/policies/ is silently
 * a no-op. `app_user` is a normal, unprivileged login role — RLS applies
 * to it unconditionally, which is what actually makes the isolation real.
 *
 * Idempotent: safe to re-run. Only generates + stores a new password the
 * first time the role is created; re-running just re-applies grants (so a
 * new migration's tables can be picked up without rotating the password).
 */

const envPath = join(__dirname, "..", ".env.local");
loadEnv({ path: envPath });

const BUSINESS_TABLES = [
  "users",
  "members",
  "plans",
  "memberships",
  "payments",
  "checkins",
] as const;

async function main() {
  const trustedUrl =
    process.env.DATABASE_TRUSTED_URL ?? process.env.DATABASE_MIGRATIONS_URL;
  if (!trustedUrl) {
    throw new Error(
      "DATABASE_TRUSTED_URL (or DATABASE_MIGRATIONS_URL) must be set — " +
        "this script needs an elevated connection to create/grant the role.",
    );
  }

  const sql = postgres(trustedUrl, { prepare: false });

  try {
    const [existing] = await sql`
      SELECT 1 FROM pg_roles WHERE rolname = 'app_user'
    `;

    let newPassword: string | null = null;

    if (!existing) {
      newPassword = randomBytes(24).toString("base64url");
      // Password is passed as a bound parameter, never string-interpolated
      // into the SQL text.
      await sql.unsafe(
        `CREATE ROLE app_user LOGIN PASSWORD '${newPassword.replace(/'/g, "''")}' ` +
          `NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION`,
      );
      console.log("Created role: app_user");
    } else {
      console.log("Role app_user already exists — re-applying grants only.");
    }

    await sql`GRANT USAGE ON SCHEMA public TO app_user`;
    // tenants has no RLS (it IS the tenant boundary) — app_user still needs
    // to read/update its own gym's row (settings page, future phases), but
    // never needs to INSERT one: that only happens through the onboarding
    // bootstrap flow, which runs on DATABASE_TRUSTED_URL, not app_user.
    await sql`GRANT SELECT, UPDATE ON tenants TO app_user`;

    for (const table of BUSINESS_TABLES) {
      await sql.unsafe(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON ${table} TO app_user`,
      );
    }

    // webhook_events is intentionally NOT granted to app_user — it's only
    // ever touched by the trusted/service-role path (webhook handlers),
    // per db/policies/README.md.

    // Best-effort: tables added by future migrations (run under the same
    // trusted role) get the same grants automatically, so this script
    // doesn't need to be re-run after every schema change. Explicit grants
    // above still apply immediately for tables that already exist.
    await sql`
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user
    `;

    if (newPassword) {
      const projectRef = extractProjectRef(trustedUrl);
      const host = `db.${projectRef}.supabase.co`;
      const appUrl = `postgresql://app_user:${encodeURIComponent(newPassword)}@${host}:5432/postgres?sslmode=require`;
      writeEnvVar(envPath, "DATABASE_URL", appUrl);
      console.log(
        "DATABASE_URL in .env.local updated to the new app_user connection " +
          "(password generated, not printed here).",
      );
    }

    console.log("Done.");
  } finally {
    await sql.end();
  }
}

function extractProjectRef(url: string): string {
  const match = url.match(/db\.([a-z0-9]+)\.supabase\.co/);
  if (!match) {
    throw new Error(
      "Could not extract Supabase project ref from DATABASE_TRUSTED_URL " +
        "(expected host like db.<ref>.supabase.co).",
    );
  }
  return match[1];
}

function writeEnvVar(path: string, key: string, value: string) {
  let content = existsSync(path) ? readFileSync(path, "utf8") : "";
  const line = `${key}="${value}"`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) {
    content = content.replace(pattern, line);
  } else {
    content = content.trimEnd() + `\n${line}\n`;
  }
  writeFileSync(path, content, "utf8");
}

main().catch((err) => {
  console.error("setup-app-role failed:", err.message);
  process.exit(1);
});
