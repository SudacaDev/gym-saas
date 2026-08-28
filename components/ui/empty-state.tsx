import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import styles from "./empty-state.module.css";

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * The "first thing a new tenant sees" state — used where a list is
 * genuinely empty (no data at all), not for a filtered/searched-to-zero
 * view, which should stay a plain line so it doesn't look identical to
 * "nothing here yet" (see e.g. staff-page's two distinct empty messages).
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(styles.container, className)}>
      <Icon className={styles.icon} aria-hidden="true" />
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
