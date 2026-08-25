ALTER TYPE "public"."checkin_method" ADD VALUE 'self_code';--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "checkin_code" text;--> statement-breakpoint
-- Hand-edited after drizzle-kit generate (T-20260825-004): the generated
-- statement was `ADD COLUMN "checkin_code" text NOT NULL`, which cannot
-- run against a table that already has rows without a default. Split
-- into: 1) add nullable, 2) backfill every existing row with a random
-- 6-digit code unique per tenant, 3) enforce NOT NULL, 4) create the
-- unique index — same shape as the short_code backfill in
-- db/migrations/0010_known_mordo.sql (T-20260825-003).
--
-- Format matches lib/members/generate-checkin-code.ts (6 digits, e.g.
-- "042917") so existing and newly-created members follow the same
-- convention. Idempotent: the WHERE checkin_code IS NULL guard means
-- re-running this against a partially-backfilled table only touches the
-- rows still missing a code.
DO $$
DECLARE
  member_row RECORD;
  candidate text;
BEGIN
  FOR member_row IN SELECT id, tenant_id FROM members WHERE checkin_code IS NULL LOOP
    LOOP
      candidate := lpad(floor(random() * 1000000)::int::text, 6, '0');
      EXIT WHEN NOT EXISTS (
        SELECT 1 FROM members
        WHERE tenant_id = member_row.tenant_id AND checkin_code = candidate
      );
    END LOOP;
    UPDATE members SET checkin_code = candidate WHERE id = member_row.id;
  END LOOP;
END $$;
--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "checkin_code" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "members_tenant_id_checkin_code_unique" ON "members" USING btree ("tenant_id","checkin_code");
