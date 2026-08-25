ALTER TABLE "staff_members" ADD COLUMN "username" text;--> statement-breakpoint
DO $$
DECLARE
  r RECORD;
  candidate text;
  suffix int;
BEGIN
  FOR r IN
    SELECT sm.id, sm.tenant_id, split_part(u.email, '@', 1) AS local_part
    FROM staff_members sm
    JOIN users u ON u.id = sm.user_id
    WHERE sm.username IS NULL
  LOOP
    candidate := regexp_replace(lower(r.local_part), '[^a-z0-9_.-]', '', 'g');
    IF candidate = '' THEN
      candidate := 'staff';
    END IF;
    suffix := 0;
    WHILE EXISTS (
      SELECT 1 FROM staff_members
      WHERE tenant_id = r.tenant_id
        AND username = candidate || CASE WHEN suffix = 0 THEN '' ELSE suffix::text END
    ) LOOP
      suffix := suffix + 1;
    END LOOP;
    UPDATE staff_members
    SET username = candidate || CASE WHEN suffix = 0 THEN '' ELSE suffix::text END
    WHERE id = r.id;
  END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "staff_members" ALTER COLUMN "username" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_members_tenant_id_username_unique" ON "staff_members" USING btree ("tenant_id","username");