-- 0003_class_schedules_rls.sql
--
-- Enables RLS for the new class_schedules table and adds its
-- tenant_isolation policy, mirroring 0001_enable_rls.sql and
-- 0002_tenant_isolation_policies.sql for every other business table. See
-- those files for why FORCE is needed and why NULLIF(...,'') guards the
-- "never set" vs "reset to empty string" cases identically. Idempotent
-- like the rest of this folder: safe to re-run.

ALTER TABLE class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_schedules FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON class_schedules;
CREATE POLICY tenant_isolation ON class_schedules
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
