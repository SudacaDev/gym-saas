import type { Member } from "@/db/schema/members";
import type { EffectiveMembershipStatus } from "@/lib/memberships/status";
import type { StatusPillTone } from "@/components/status-pill";

/**
 * Shape returned by GET app/api/v1/members — Member joined with the
 * effective status/end date of their current membership (see
 * getCurrentMembership/getCurrentEffectiveStatus), same computation the
 * dashboard uses for "socios activos"/vencimientos so this list can't
 * disagree with it.
 */
export type MemberWithStatus = Member & {
  membershipStatus: EffectiveMembershipStatus;
  membershipEndDate: string | null;
};

const EXPIRING_SOON_DAYS = 7;

function daysUntil(dateOnly: string, now: Date): number {
  const end = new Date(`${dateOnly}T00:00:00Z`).getTime();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((end - today) / (24 * 60 * 60 * 1000));
}

const STATUS_URGENCY_RANK: Record<EffectiveMembershipStatus, number> = {
  active: 0,
  expired: 1,
  none: 2,
  paused: 3,
  cancelled: 4,
};

/**
 * Default sort for the Socios list: active members first (soonest-expiring
 * on top, since ISO endDate strings sort lexicographically the same as
 * chronologically), then expired, then the rest — the fact PRODUCT.md says
 * matters most (who's about to expire) is the first thing the list shows.
 */
export function compareMembersByUrgency(a: MemberWithStatus, b: MemberWithStatus): number {
  const rankDiff = STATUS_URGENCY_RANK[a.membershipStatus] - STATUS_URGENCY_RANK[b.membershipStatus];
  if (rankDiff !== 0) return rankDiff;
  if (a.membershipEndDate && b.membershipEndDate) {
    return a.membershipEndDate.localeCompare(b.membershipEndDate);
  }
  if (a.membershipEndDate) return -1;
  if (b.membershipEndDate) return 1;
  return 0;
}

/**
 * Status-pill tone + label for a member's current membership — matches the
 * dashboard's "vence en N días" alert window (7 days) so this column and
 * the dashboard's vencimientos block never disagree about who's expiring
 * soon.
 */
export function membershipDisplay(
  member: Pick<MemberWithStatus, "membershipStatus" | "membershipEndDate">,
  now: Date = new Date(),
): { tone: StatusPillTone; label: string } {
  const { membershipStatus, membershipEndDate } = member;

  if (membershipStatus === "active" && membershipEndDate) {
    const days = daysUntil(membershipEndDate, now);
    if (days <= EXPIRING_SOON_DAYS) {
      return {
        tone: "alert",
        label: days <= 0 ? "Vence hoy" : days === 1 ? "Vence mañana" : `Vence en ${days} días`,
      };
    }
  }

  switch (membershipStatus) {
    case "active":
      return { tone: "success", label: "Activo" };
    case "expired":
      return { tone: "danger", label: "Vencido" };
    case "paused":
      return { tone: "neutral", label: "Pausado" };
    case "cancelled":
      return { tone: "neutral", label: "Cancelado" };
    case "none":
      return { tone: "neutral", label: "Sin plan" };
  }
}
