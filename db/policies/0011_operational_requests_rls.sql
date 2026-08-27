-- 0011_operational_requests_rls.sql
--
-- Enables RLS for operational_requests (T-20260826-010) and adds its
-- tenant_isolation policy, mirroring 0001-0010 for every other business
-- table. Idempotent like the rest of this folder: safe to re-run.

ALTER TABLE operational_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_requests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON operational_requests;
CREATE POLICY tenant_isolation ON operational_requests
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
