-- 0010_leads_rls.sql
--
-- Enables RLS for leads (T-20260826-013) and adds its tenant_isolation
-- policy, mirroring 0001-0009 for every other business table. Idempotent
-- like the rest of this folder: safe to re-run.

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON leads;
CREATE POLICY tenant_isolation ON leads
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
