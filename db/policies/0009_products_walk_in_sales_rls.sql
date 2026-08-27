-- 0009_products_walk_in_sales_rls.sql
--
-- Enables RLS for products and walk_in_sales (T-20260826-012) and adds
-- their tenant_isolation policies, mirroring 0001-0008 for every other
-- business table. Idempotent like the rest of this folder: safe to re-run.

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON products;
CREATE POLICY tenant_isolation ON products
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE walk_in_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE walk_in_sales FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON walk_in_sales;
CREATE POLICY tenant_isolation ON walk_in_sales
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
