import Link from "next/link";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { getDashboardMetrics } from "@/lib/dashboard/metrics";
import { cn } from "@/lib/utils";
import {
  currencyFormatter,
  integerFormatter,
  dayMonthFormatter,
  monthYearFormatter,
  relativeTime,
  activityLabel,
} from "./lib/format";
import { CALENDAR_WEEKDAY_LABELS, buildCalendarWeeks } from "./lib/calendar";
import { SPARKLINE_X_POSITIONS, buildSparklinePoints } from "./lib/sparkline";
import styles from "./index.module.css";

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
