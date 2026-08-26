-- 0001_enable_rls.sql
--
-- Turns on Row-Level Security for every tenant-scoped business table, and
-- FORCES it so that even the table owner (the role migrations run as) is
-- subject to the policies. Without FORCE ROW LEVEL SECURITY, a superuser
-- or table-owner connection (which is exactly what most connection
-- poolers/ORMs use) bypasses RLS entirely by default — we do not rely on
-- the app only ever connecting as a low-privilege role, we force it at
-- the table level instead.
--
-- `webhook_events` is intentionally excluded — see README.md.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE members FORCE ROW LEVEL SECURITY;

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans FORCE ROW LEVEL SECURITY;

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;

ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins FORCE ROW LEVEL SECURITY;
