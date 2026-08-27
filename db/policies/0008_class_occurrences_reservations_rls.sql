-- 0008_class_occurrences_reservations_rls.sql
--
-- Enables RLS for class_occurrences and class_reservations (T-20260826-011)
-- and adds their tenant_isolation policies, mirroring 0001-0007 for every
-- other business table. Idempotent like the rest of this folder: safe to
-- re-run.

ALTER TABLE class_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_occurrences FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON class_occurrences;
CREATE POLICY tenant_isolation ON class_occurrences
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE class_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_reservations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON class_reservations;
CREATE POLICY tenant_isolation ON class_reservations
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
