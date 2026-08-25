ALTER TABLE "members" ADD COLUMN "short_code" text;--> statement-breakpoint
-- Hand-edited after drizzle-kit generate (T-20260825-003): the generated
-- statement was `ADD COLUMN "short_code" text NOT NULL`, which cannot run
-- against a table that already has rows without a default. Split into:
-- 1) add nullable, 2) backfill every existing row with a unique per-tenant
-- code, 3) enforce NOT NULL, 4) create the unique index — same shape as
-- the class_schedules.activity_id backfill in T-20260821-008
-- (db/migrations/0006_quiet_bedlam.sql), collapsed into a single pass here
-- because unlike that case there's no FK/catalog table to populate first,
-- just a random code generated per row with a collision-safe retry loop.
--
-- Format matches lib/members/generate-short-code.ts (2 letters + 2 digits
-- + 2 letters, e.g. "AB12CD") so existing and newly-created members follow
-- the same convention. Idempotent: the WHERE short_code IS NULL guard
-- means re-running this against a partially-backfilled table only touches
-- the rows still missing a code.
DO $$
DECLARE
  member_row RECORD;
  candidate text;
  letters text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
BEGIN
  FOR member_row IN SELECT id, tenant_id FROM members WHERE short_code IS NULL LOOP
    LOOP
      candidate :=
        substr(letters, (floor(random() * 26) + 1)::int, 1) ||
        substr(letters, (floor(random() * 26) + 1)::int, 1) ||
        floor(random() * 10)::int::text ||
        floor(random() * 10)::int::text ||
        substr(letters, (floor(random() * 26) + 1)::int, 1) ||
        substr(letters, (floor(random() * 26) + 1)::int, 1);
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM members
        WHERE tenant_id = member_row.tenant_id AND short_code = candidate
      );
    END LOOP;
    UPDATE members SET short_code = candidate WHERE id = member_row.id;
  END LOOP;
END $$;
--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "short_code" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "members_tenant_id_short_code_unique" ON "members" USING btree ("tenant_id","short_code");
