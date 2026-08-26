import type { StatusPillTone } from "@/components/status-pill";
import type { EffectiveMembershipStatus } from "./status";

/**
 * Shared membership-status → label/tone tables, used by both
 * checkin-page and member-detail-page (previously each kept its own copy —
 * see status-pill.tsx's docstring). Only three tones exist for five
 * effective states: "expired" reads as alert, "cancelled"/"none" fall back
 * to neutral alongside "paused".
 */
export const MEMBERSHIP_STATUS_LABELS: Record<EffectiveMembershipStatus, string> = {
  active: "Activa",
  paused: "Pausada",
  cancelled: "Cancelada",
  expired: "Vencida",
  none: "Sin membresía",
};

export const MEMBERSHIP_STATUS_TONES: Record<EffectiveMembershipStatus, StatusPillTone> = {
  active: "success",
  expired: "alert",
  paused: "neutral",
  cancelled: "neutral",
  none: "neutral",
};
