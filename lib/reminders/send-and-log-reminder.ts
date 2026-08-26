import { and, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { schema } from "@/db/client";
import { sendMembershipReminderEmail } from "@/lib/email/membership-reminder";

export interface SendAndLogReminderInput {
  tx: Db;
  tenantId: string;
  tenantName: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
  membershipId: string;
  planName: string;
  endDate: string;
  type: "reminder" | "manual";
  triggeredByUserId: string | null;
  // Only set for type "reminder" — the due date this reminder is for,
  // doubling as the idempotency key (see email-send-log.ts's docstring).
  // Left null for "manual" sends.
  reminderScheduledFor: string | null;
}

export type SendAndLogReminderResult =
  | { outcome: "sent" }
  | { outcome: "failed"; reason: string }
  | { outcome: "already_sent" };

/**
 * Sends one membership-reminder email and records the attempt in
 * email_send_log — used by both the automatic cron
 * (app/api/cron/membership-reminders/route.ts) and the manual send
 * endpoint (app/api/v1/memberships/[id]/send-reminder/route.ts), so the
 * two paths can never drift into logging differently.
 *
 * For type "reminder" this first checks whether a row already exists for
 * (membershipId, reminderScheduledFor) and skips sending if so — cheap
 * idempotency guard against the cron firing twice for the same due date.
 * This is a plain SELECT-then-INSERT, not a claimed row / advisory lock:
 * good enough for a single daily cron invocation (this project has no
 * concurrent-job infrastructure anywhere else either), but two truly
 * concurrent callers for the same membership could both pass the check
 * and both send — the unique index on email_send_log still guarantees only
 * one of their INSERTs succeeds, so the log never ends up with a duplicate
 * row even in that unlikely case, but the second email could have already
 * gone out. Acceptable for v1 at this scale; revisit if this ever runs
 * from more than one cron trigger at once.
 */
export async function sendAndLogReminder(
  input: SendAndLogReminderInput,
): Promise<SendAndLogReminderResult> {
  const { tx } = input;

  if (input.type === "reminder" && input.reminderScheduledFor) {
    const [existing] = await tx
      .select({ id: schema.emailSendLog.id })
      .from(schema.emailSendLog)
      .where(
        and(
          eq(schema.emailSendLog.membershipId, input.membershipId),
          eq(
            schema.emailSendLog.reminderScheduledFor,
            input.reminderScheduledFor,
          ),
        ),
      );
    if (existing) {
      return { outcome: "already_sent" };
    }
  }

  if (!input.member.email) {
    await tx.insert(schema.emailSendLog).values({
      tenantId: input.tenantId,
      memberId: input.member.id,
      membershipId: input.membershipId,
      triggeredByUserId: input.triggeredByUserId,
      type: input.type,
      status: "failed",
      reminderScheduledFor: input.reminderScheduledFor,
      errorMessage: "El socio no tiene email cargado",
    });
    return { outcome: "failed", reason: "El socio no tiene email cargado" };
  }

  try {
    const { providerMessageId } = await sendMembershipReminderEmail({
      memberName: `${input.member.firstName} ${input.member.lastName}`,
      memberEmail: input.member.email,
      tenantName: input.tenantName,
      planName: input.planName,
      endDate: input.endDate,
    });
    await tx.insert(schema.emailSendLog).values({
      tenantId: input.tenantId,
      memberId: input.member.id,
      membershipId: input.membershipId,
      triggeredByUserId: input.triggeredByUserId,
      type: input.type,
      status: "sent",
      reminderScheduledFor: input.reminderScheduledFor,
      providerMessageId,
    });
    return { outcome: "sent" };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await tx.insert(schema.emailSendLog).values({
      tenantId: input.tenantId,
      memberId: input.member.id,
      membershipId: input.membershipId,
      triggeredByUserId: input.triggeredByUserId,
      type: input.type,
      status: "failed",
      reminderScheduledFor: input.reminderScheduledFor,
      errorMessage: reason,
    });
    return { outcome: "failed", reason };
  }
}
