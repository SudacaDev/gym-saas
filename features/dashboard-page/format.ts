import type { getDashboardMetrics } from "@/lib/dashboard/metrics";

export const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export const integerFormatter = new Intl.NumberFormat("es-AR");

export const dayMonthFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export const monthYearFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function dateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * "Hace 5 min" / "Hace 3h" / "Ayer" / "20 ago" — coarse-grained on purpose,
 * this is a glance-and-move-on feed, not a precise timestamp log.
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

export function activityLabel(
  item: Awaited<ReturnType<typeof getDashboardMetrics>>["recentActivity"][number],
): { name: string; rest: string } {
  switch (item.type) {
    case "checkin":
      return { name: item.memberName, rest: "hizo check-in" };
    case "payment":
      return { name: item.memberName, rest: `pagó ${currencyFormatter.format(item.amount)}` };
    case "new_member":
      return { name: item.memberName, rest: "se sumó como socio" };
  }
}
