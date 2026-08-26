import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Mirror tsconfig.json's "@/*" -> "./*" path alias for Vitest, which
      // doesn't read tsconfig `paths` on its own.
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // "npm run test:unit" currently has no unit tests yet (Phase 0 only
    // ships the RLS integration test) — don't fail CI just because the
    // dir is empty.
    passWithNoTests: true,
    // Integration tests do real network round-trips against Postgres
    // (Supabase's direct connection in particular can take several
    // seconds to establish + seed two tenants' worth of fixtures) — the
    // 10s default hook/test timeout is tuned for in-memory unit tests
    // and isn't enough here.
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
