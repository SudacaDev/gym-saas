import Link from "next/link";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { getDashboardMetrics } from "@/lib/dashboard/metrics";
import { cn } from "@/lib/utils";
import styles from "./index.module.css";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const integerFormatter = new Intl.NumberFormat("es-AR");

const dayMonthFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const monthYearFormatter = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function dateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * "Hace 5 min" / "Hace 3h" / "Ayer" / "20 ago" — coarse-grained on purpose,
 * this is a glance-and-move-on feed, not a precise timestamp log.
 */
function relativeTime(at: Date, now: Date): string {
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

function activityLabel(
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

interface CalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isExpiring: boolean;
}

const CALENDAR_WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

/**
 * Grilla de semanas completas (lunes a domingo) que cubre el mes de `now`,
 * con los días fuera de mes incluidos para completar la grilla (atenuados
 * en la UI). isExpiring solo marca fechas presentes en expiringDates —
 * hoy esa fecha nunca cae más allá de 7 días porque expiringMembers ya
 * viene acotado a esa ventana desde getDashboardMetrics.
 */
function buildCalendarWeeks(now: Date, expiringDates: Set<string>): CalendarDay[][] {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const todayStr = dateOnlyString(now);

  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const leadingDays = (firstOfMonth.getUTCDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth.getTime() - leadingDays * 24 * 60 * 60 * 1000);
  const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;

  const cells: CalendarDay[] = [];
  for (let i = 0; i < totalCells; i++) {
    const date = new Date(gridStart.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = dateOnlyString(date);
    cells.push({
      date: dateStr,
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month,
      isToday: dateStr === todayStr,
      isExpiring: expiringDates.has(dateStr),
    });
  }

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

const SPARKLINE_X_POSITIONS = [10, 58, 106, 154, 202, 250, 298];

function buildSparklinePoints(counts: number[]): string {
  const maxValue = Math.max(...counts, 1);
  return counts
    .map((count, i) => {
      const y = 90 - (count / maxValue) * 70;
      return `${SPARKLINE_X_POSITIONS[i]},${y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * Owner dashboard. Server Component (no interactivity, loads once). Un
 * socio nuevo (metrics.totalMembers === 0) ve un estado de bienvenida en
 * vez de esta pantalla — ver el branch de abajo. Para el resto: un único
 * número protagonista (ingresos del mes) en vez de una grilla de tarjetas
 * parejas, calendario de vencimientos, sparkline de check-ins, ranking de
 * socios y el feed de actividad — todo con los mismos datos que ya
 * calculaba este dashboard, sin módulos nuevos.
 */
export async function DashboardPage() {
  const context = await getTenantContext();
  const now = new Date();
  const metrics = await getDashboardMetrics(context.tenantId, context.role, now);

  if (metrics.totalMembers === 0) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Dashboard</h1>
        <div className={styles.onboarding}>
          <p className={styles.onboardingEyebrow}>Empecemos</p>
          <h2 className={styles.onboardingTitle}>Todavía no cargaste nada</h2>
          <p className={styles.onboardingText}>
            Con un plan y tu primer socio cargados, este panel empieza a mostrar tu actividad real:
            ingresos, vencimientos y check-ins.
          </p>
          <div className={styles.onboardingActions}>
            <Link href="/plans" className={styles.onboardingAction}>
              1. Creá tu primer plan
            </Link>
            <Link href="/members" className={styles.onboardingAction}>
              2. Dá de alta tu primer socio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const hasExpiring = metrics.expiringIn7Days > 0;
  const expiringDates = new Set(metrics.expiringMembers.map((m) => m.endDate));
  const calendarWeeks = buildCalendarWeeks(now, expiringDates);
  const monthLabel = monthYearFormatter.format(now);

  const sparklineCounts = metrics.checkinsLast7Days.map((d) => d.count);
  const sparklinePoints = buildSparklinePoints(sparklineCounts);
  const lastDay = metrics.checkinsLast7Days[metrics.checkinsLast7Days.length - 1];
  const lastPoint = SPARKLINE_X_POSITIONS[SPARKLINE_X_POSITIONS.length - 1];
  const lastY = 90 - (lastDay.count / Math.max(...sparklineCounts, 1)) * 70;

  return (
    <div className={styles.container}>
      <h1 className={styles.srOnlyTitle}>Dashboard</h1>

      <div className={styles.hero}>
        {context.role === "owner" && (
          <div>
            <p className={styles.heroLabel}>Ingresos del mes</p>
            <p className={styles.heroValue}>{currencyFormatter.format(metrics.revenueThisMonth)}</p>
            {metrics.revenueTrendPct !== null && (
              <p className={styles.heroTrend}>
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 12 12"
                  className={metrics.revenueTrendPct >= 0 ? styles.trendIconUp : styles.trendIconDown}
                  aria-hidden="true"
                >
                  {metrics.revenueTrendPct >= 0 ? <path d="M6 2l5 8H1z" /> : <path d="M6 10L1 2h10z" />}
                </svg>
                <span
                  className={
                    metrics.revenueTrendPct >= 0 ? styles.trendValueUp : styles.trendValueDown
                  }
                >
                  {Math.abs(metrics.revenueTrendPct)}%
                </span>
                vs mes pasado
              </p>
            )}
          </div>
        )}

        <div className={styles.statRow}>
          <div className={styles.statItem}>
            <p className={styles.statLabel}>Socios activos</p>
            <p className={styles.statValue}>
              {integerFormatter.format(metrics.activeMembers)}
              <span className={styles.statValueMuted}>
                {" "}
                / {integerFormatter.format(metrics.totalMembers)}
              </span>
            </p>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <p className={cn(styles.statLabel, hasExpiring && styles.statLabelAlert)}>
              Vencen en 7 días
            </p>
            <p className={cn(styles.statValue, hasExpiring && styles.statValueAlert)}>
              {integerFormatter.format(metrics.expiringIn7Days)}
            </p>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.statItem}>
            <p className={styles.statLabel}>Check-ins hoy</p>
            <p className={styles.statValue}>{integerFormatter.format(metrics.checkinsToday)}</p>
          </div>
        </div>
      </div>

      <div className={styles.twoCol}>
        <div>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Vencimientos</h2>
            <span className={styles.panelMeta}>{monthLabel}</span>
          </div>

          <div className={styles.calendarGrid}>
            {CALENDAR_WEEKDAY_LABELS.map((label, i) => (
              <span key={i} className={styles.calendarWeekday}>
                {label}
              </span>
            ))}
            {calendarWeeks.flat().map((cell) => (
              <span
                key={cell.date}
                className={cn(
                  styles.calendarDay,
                  !cell.inMonth && styles.calendarDayMuted,
                  cell.isToday && styles.calendarDayToday,
                )}
              >
                {cell.day}
                {cell.isExpiring && <span className={styles.calendarDayExpiringDot} />}
              </span>
            ))}
          </div>

          {hasExpiring && (
            <div className={styles.expiringList}>
              {metrics.expiringMembers.map((member) => (
                <Link key={member.memberId} href={`/members/${member.memberId}`} className={styles.expiringRow}>
                  <span className={styles.expiringName}>{member.memberName}</span>
                  <span className={styles.expiringDate}>
                    {dayMonthFormatter.format(new Date(`${member.endDate}T00:00:00Z`))}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Check-ins</h2>
            <span className={styles.panelMeta}>Últimos 7 días</span>
          </div>

          <div className={styles.sparklineWrap}>
            <svg viewBox="0 0 308 100" width="100%" height="130" preserveAspectRatio="none">
              <line x1="0" y1="90" x2="308" y2="90" className={styles.sparklineGridLine} />
              <line x1="0" y1="55" x2="308" y2="55" className={styles.sparklineGridLine} />
              <line x1="0" y1="20" x2="308" y2="20" className={styles.sparklineGridLine} />
              <polyline points={sparklinePoints} className={styles.sparklineLine} />
              <circle cx={lastPoint} cy={lastY} r="3.5" className={styles.sparklineDot} />
            </svg>
          </div>
          <div className={styles.sparklineLabels}>
            {metrics.checkinsLast7Days.map((d, i) => (
              <span
                key={d.date}
                className={cn(
                  styles.sparklineLabel,
                  i === metrics.checkinsLast7Days.length - 1 && styles.sparklineLabelToday,
                )}
              >
                {d.label}
                {i === metrics.checkinsLast7Days.length - 1 && ` · ${d.count}`}
              </span>
            ))}
          </div>
        </div>
      </div>

      {metrics.topMembersByCheckins.length > 0 && (
        <div>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Top socios</h2>
            <span className={styles.panelMeta}>Por check-ins este mes</span>
          </div>
          <div className={styles.leaderboard}>
            {metrics.topMembersByCheckins.map((member, i) => (
              <div key={member.memberId} className={styles.leaderboardRow}>
                <span className={styles.leaderboardRank}>{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.leaderboardName}>{member.memberName}</span>
                <span className={styles.leaderboardCount}>{integerFormatter.format(member.count)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {metrics.recentActivity.length > 0 && (
        <div>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>Actividad reciente</h2>
          </div>
          <div className={styles.activityTimeline}>
            {metrics.recentActivity.map((item, i) => {
              const { name, rest } = activityLabel(item);
              return (
                <div key={i} className={styles.activityRow}>
                  <span
                    className={cn(
                      styles.activityDot,
                      item.type === "payment" && styles.activityDotPayment,
                    )}
                  />
                  <p className={styles.activityText}>
                    <span className={styles.activityName}>{name}</span> {rest}
                  </p>
                  <span className={styles.activityTime}>{relativeTime(item.at, now)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
