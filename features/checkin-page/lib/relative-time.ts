const dayMonthFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
});

/**
 * "Recién" / "Hace 5 min" / "Hace 3h" / "Ayer" / "20 ago" — coarse-grained
 * on purpose, this is a glance-and-move-on feed (the "feed en vivo" column,
 * T-20260826-015), not a precise timestamp log. Deliberately a small local
 * duplicate of dashboard-page/lib/format.ts's `relativeTime` rather than a
 * cross-feature import — every feature in this project owns its own
 * lib/hooks, none import from a sibling feature (see reducto: no
 * `@/features/*` import appears anywhere under `features/`).
 */
export function relativeTime(at: Date, now: Date): string {
  const diffMs = now.getTime() - at.getTime();
  const diffMin = Math.floor(diffMs / (60 * 1000));
  if (diffMin < 1) return "Recién";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return dayMonthFormatter.format(at);
}
