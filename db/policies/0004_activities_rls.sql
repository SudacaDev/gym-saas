-- 0004_activities_rls.sql
--
-- Enables RLS for the new activities table and adds its tenant_isolation
-- policy, mirroring 0001/0002/0003 for every other business table. See
-- those files for why FORCE is needed and why NULLIF(...,'') guards the
-- "never set" vs "reset to empty string" cases identically. Idempotent
-- like the rest of this folder: safe to re-run.

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON activities;
CREATE POLICY tenant_isolation ON activities
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
