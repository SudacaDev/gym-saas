-- 0006_staff_members_rls.sql
--
-- Enables RLS for the new staff_members table and adds its
-- tenant_isolation policy, mirroring 0001-0005 for every other business
-- table. See those files for why FORCE is needed and why NULLIF(...,'')
-- guards the "never set" vs "reset to empty string" cases identically.
-- Idempotent like the rest of this folder: safe to re-run.

ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON staff_members;
CREATE POLICY tenant_isolation ON staff_members
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
