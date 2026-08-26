-- 0005_email_send_log_rls.sql
--
-- Enables RLS for the new email_send_log table and adds its
-- tenant_isolation policy, mirroring 0001-0004 for every other business
-- table. See those files for why FORCE is needed and why NULLIF(...,'')
-- guards the "never set" vs "reset to empty string" cases identically.
-- Idempotent like the rest of this folder: safe to re-run.

ALTER TABLE email_send_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_send_log FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON email_send_log;
CREATE POLICY tenant_isolation ON email_send_log
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
