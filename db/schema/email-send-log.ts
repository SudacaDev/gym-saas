import { pgTable, uuid, date, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { members } from "./members";
import { memberships } from "./memberships";
import { users } from "./users";
import { emailSendTypeEnum, emailSendStatusEnum } from "./enums";

/**
 * Audit trail for every membership-reminder email attempt — both the
 * automatic cron (type "reminder") and an owner/staff-triggered send (type
 * "manual"). Exists so staff can answer "did we actually send this?"
 * without guessing, and so the cron never double-sends the same reminder.
 *
 * `reminderScheduledFor` + the unique index below is the idempotency guard
 * for the automatic path: one row per (membership, due date), so a cron
 * retry (or a second deploy running the same day) can't fire the same
 * reminder twice. It's left null for manual sends — Postgres treats NULLs
 * as distinct in a unique index, so manual rows never collide with each
 * other or with the automatic ones.
 */
export const emailSendLog = pgTable(
  "email_send_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    membershipId: uuid("membership_id").references(() => memberships.id, {
      onDelete: "cascade",
    }),
    // Who clicked "send" for a manual reminder; null for the automatic
    // cron, which is how the two are told apart alongside `type`.
    triggeredByUserId: uuid("triggered_by_user_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    type: emailSendTypeEnum("type").notNull(),
    status: emailSendStatusEnum("status").notNull(),
    reminderScheduledFor: date("reminder_scheduled_for"),
    providerMessageId: text("provider_message_id"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("email_send_log_membership_reminder_unique").on(
      table.membershipId,
      table.reminderScheduledFor,
    ),
  ],
);

export type EmailSendLog = typeof emailSendLog.$inferSelect;
export type NewEmailSendLog = typeof emailSendLog.$inferInsert;
