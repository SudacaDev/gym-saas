-- 0002_tenant_isolation_policies.sql
--
-- One tenant-isolation policy per business table. `current_setting(...,
-- true)` with the second arg `true` means "missing_ok": if
-- app.current_tenant_id was never set on this connection/transaction at
-- all, current_setting returns NULL. BUT once a session has set it at
-- least once via `set_config(..., true)` (is_local) inside some earlier
-- transaction, Postgres resets a never-globally-set custom GUC back to ''
-- (empty string) after that transaction ends, not NULL — pooled
-- connections make this the common case, not the exception. `''::uuid`
-- raises a hard cast error rather than comparing false, so this is
-- wrapped in NULLIF(..., '') to normalize both "never set" and "reset to
-- empty" down to a single NULL. Either way, `tenant_id = NULL` is never
-- true for any row, so the query fails CLOSED (zero rows / no
-- rows insertable-or-updatable) rather than open or erroring.
--
-- FOR ALL + WITH CHECK covers SELECT/INSERT/UPDATE/DELETE symmetrically:
-- USING filters which existing rows are visible/targetable, WITH CHECK
-- rejects any inserted/updated row whose tenant_id doesn't match the
-- current tenant (so tenant A can't write a row stamped as tenant B's).
--
-- DROP POLICY IF EXISTS first so this file can be re-applied safely
-- (CREATE POLICY has no IF NOT EXISTS form in Postgres).

DROP POLICY IF EXISTS tenant_isolation ON users;
CREATE POLICY tenant_isolation ON users
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON members;
CREATE POLICY tenant_isolation ON members
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON plans;
CREATE POLICY tenant_isolation ON plans
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON memberships;
CREATE POLICY tenant_isolation ON memberships
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON payments;
CREATE POLICY tenant_isolation ON payments
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

DROP POLICY IF EXISTS tenant_isolation ON checkins;
CREATE POLICY tenant_isolation ON checkins
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
