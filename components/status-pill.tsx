import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./status-pill.module.css";

export type StatusPillTone = "success" | "alert" | "neutral" | "danger" | "info";

const TONE_CLASSES: Record<StatusPillTone, string> = {
  success: styles.success,
  alert: styles.alert,
  neutral: styles.neutral,
  danger: styles.danger,
  info: styles.info,
};

/**
 * The one "Bold Athletic" status pill — tinted dark background, matching
 * text, a current-color dot. Every status/state badge in the app (member
 * status, payment status, "en el gym ahora") renders through this instead
 * of each screen hand-rolling its own bg/text hex pair — see
 * app/globals.css's --status-* tokens for the actual color values.
 */
export function StatusPill({ tone, children }: { tone: StatusPillTone; children: ReactNode }) {
  return (
    <span className={cn(styles.pill, TONE_CLASSES[tone])}>
      <span className={styles.dot} />
      {children}
    </span>
  );
}
