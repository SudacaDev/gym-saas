# db/policies

Hand-written SQL applied *after* `drizzle-kit migrate` by
`scripts/apply-policies.ts`. Drizzle owns table/column/enum DDL (generated
migrations in `db/migrations/`); this folder owns everything Postgres-RLS
related, which Drizzle does not model.

## Numbering convention

Files are applied in filename order, so they're prefixed `NNNN_` (4-digit,
zero-padded, gapless) exactly like Drizzle's own migration files:

- `0001_enable_rls.sql`
- `0002_tenant_isolation_policies.sql`

Each file should be a focused, idempotent unit — safe to re-run against a
database that already has it applied (`ENABLE ROW LEVEL SECURITY` is
naturally idempotent; policy files use `DROP POLICY IF EXISTS` before
`CREATE POLICY` since Postgres has no `CREATE POLICY IF NOT EXISTS`).

## Adding a new policy

1. Create the next `NNNN_description.sql` file (next integer after the
   highest existing prefix).
2. If it's a new business table: add `ENABLE ROW LEVEL SECURITY` +
   `FORCE ROW LEVEL SECURITY` for it (mirror `0001`), and a
   `tenant_isolation` policy for it (mirror `0002`) — new tables default
   to being covered unless there's a specific reason not to (see below).
3. Run `npm run db:migrate`, which runs `drizzle-kit migrate` and then
   `scripts/apply-policies.ts` (applies every file in this folder, in
   order, every time — each file must stay idempotent per the convention
   above).
4. Add/extend the isolation test in
   `tests/integration/tenant-isolation/rls-policies.test.ts` to cover the
   new table.

## Why `webhook_events` has no policy here

`webhook_events` is deliberately **not** covered by `0001`/`0002`. It has
no `tenant_id` column at all: it stores raw inbound webhook deliveries —
not currently wired up to anything (auth moved from Clerk's webhook-driven
sync to Supabase Auth, see app/onboarding), reserved for payment-gateway
(Stripe) events in a later phase. Whenever it's next used, that's for a
trusted server code path that creates/updates tenant-scoped rows from an
event with no tenant context yet available — same shape the old Clerk
webhook handler had — so RLS keyed on `app.current_tenant_id` doesn't
apply to it.

Its protection model is different: it is only ever meant to be read/
written by trusted, non-request-scoped server code (a webhook route
handler after signature verification, and internal scripts) using the raw
client from `db/client.ts` directly — **never** through
`withTenantContext`, and never exposed through any tenant-facing query
path. If a future phase needs to expose webhook event data to tenants
(e.g. a payment-events audit log), that should be a *new*, tenant-scoped
table populated from `webhook_events`, not a loosening of this table's
access model.
