import { pgTable, uuid, text, jsonb, timestamp } from "drizzle-orm/pg-core";

/**
 * Raw inbound webhook events (not wired to anything today — auth moved
 * from Clerk's webhook-driven sync to Supabase Auth, see app/onboarding;
 * reserved for payment-gateway/Stripe events in a later phase), kept for
 * idempotency (`eventId` unique -> safe to retry
 * delivery) and as an audit trail.
 *
 * Deliberately has NO `tenant_id` and NO RLS policy: it is not
 * tenant-scoped data, it's the *mechanism* by which tenant data (e.g. a
 * `tenants` row) gets created in the first place, so it is only ever
 * written/read by trusted server code (the webhook route handler and the
 * apply-policies/worker scripts) using the raw, non-tenant-scoped DB
 * client — never through `withTenantContext`. See db/policies/README.md.
 */
export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: text("event_id").notNull().unique(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
