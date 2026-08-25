-- 0007_staff_attendance_rls.sql
--
-- Enables RLS for the new staff_attendance table and adds its
-- tenant_isolation policy, mirroring 0001-0006 for every other business
-- table. See 0006_staff_members_rls.sql for why FORCE is needed.
-- Idempotent like the rest of this folder: safe to re-run.

ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON staff_attendance;
CREATE POLICY tenant_isolation ON staff_attendance
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
