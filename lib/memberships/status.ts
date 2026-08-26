import type { Membership } from "@/db/schema/memberships";
import { membershipStatusEnum } from "@/db/schema/enums";

export type MembershipStatus = (typeof membershipStatusEnum.enumValues)[number];

/** "none" = the member has never had a membership at all (not a DB enum value). */
export type EffectiveMembershipStatus = MembershipStatus | "none";

/**
 * Effective status of a single membership, reconciling the stored `status`
 * column with `endDate`.
 *
 * Rules:
 *  - "paused"/"cancelled" are explicit operator decisions — a date can't
 *    override them, so they're returned as-is.
 *  - "active" whose `endDate` has already passed reads as "expired" here
 *    even though nothing writes that back to the DB row (nothing does, by
 *    design — this function *is* the "flip", computed on read instead of
 *    needing a cron/trigger to keep the column in sync).
 *  - `endDate === null` (open-ended membership, e.g. one that was created
 *    but never paid/renewed yet) never expires on its own.
 */
export function getEffectiveStatus(
  membership: Pick<Membership, "status" | "endDate">,
  now: Date = new Date(),
): MembershipStatus {
  if (membership.status === "paused" || membership.status === "cancelled") {
    return membership.status;
  }
  if (membership.endDate !== null && hasPassed(membership.endDate, now)) {
    return "expired";
  }
  return membership.status;
}

/**
 * `endDate` is a DATE column (no time component), so a membership is still
 * good on its endDate itself — it expires the day *after*. Compared as
 * calendar dates (UTC) rather than instants so the server's local
 * timezone can't shift which calendar day "today" is.
 */
function hasPassed(dateOnly: string, now: Date): boolean {
  const end = new Date(`${dateOnly}T00:00:00Z`).getTime();
  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return end < today;
}

/**
 * The membership that matters for "is this member current" out of their
 * full history: the one with the most recent `startDate` (a member can
 * rejoin after a gap — a later startDate always wins over an earlier one,
 * regardless of either membership's status). Ties (e.g. two memberships
 * entered with the same startDate) are broken by `createdAt`, most recent
 * wins.
 *
 * `createdAt` is typed as `Date | string` rather than tied to
 * `Membership`'s own `Date` column type — client-side callers work with
 * memberships round-tripped through `fetch().json()`, where `createdAt`
 * arrives as an ISO string, not a `Date` instance.
 */
export function getCurrentMembership<
  T extends { startDate: string; createdAt: Date | string },
>(memberships: readonly T[]): T | null {
  if (memberships.length === 0) return null;

  return memberships.reduce((latest, candidate) => {
    if (candidate.startDate !== latest.startDate) {
      return candidate.startDate > latest.startDate ? candidate : latest;
    }
    return new Date(candidate.createdAt).getTime() >
      new Date(latest.createdAt).getTime()
      ? candidate
      : latest;
  });
}

/**
 * Convenience for "is this member up to date": picks the current
 * membership out of their full history (see getCurrentMembership) and
 * returns its effective status, or "none" if they've never had one.
 */
export function getCurrentEffectiveStatus(
  memberships: readonly (Pick<Membership, "status" | "startDate" | "endDate"> & {
    createdAt: Date | string;
  })[],
  now: Date = new Date(),
): EffectiveMembershipStatus {
  const current = getCurrentMembership(memberships);
  return current ? getEffectiveStatus(current, now) : "none";
}
