import { and, desc, eq, gte, isNull, lt, lte, sql } from "drizzle-orm";
import { schema } from "@/db/client";
import { withTenantContext, type TenantRole } from "@/db/rls-context";
import { getCurrentEffectiveStatus } from "@/lib/memberships/status";

export interface DashboardMetrics {
  /**
   * Suma de payments.amount con status "paid" cuyo createdAt cae en el mes
   * calendario actual.
   */
  revenueThisMonth: number;
  /**
   * Cantidad de members (no eliminados) cuya membresía vigente (ver
   * getCurrentEffectiveStatus) tiene estado efectivo "active".
   */
  activeMembers: number;
  /**
   * Cantidad de memberships con status "active" cuyo endDate cae dentro de
   * los próximos 7 días desde hoy (inclusive de ambos extremos).
   */
  expiringIn7Days: number;
  /** Cantidad de checkins cuyo timestamp cae en el día calendario de hoy. */
  checkinsToday: number;
  /**
   * El detalle detrás de expiringIn7Days — quién vence, no solo cuántos.
   * Sin esto el número de alerta no es accionable: el dueño lo ve pero no
   * sabe a quién contactar. Ordenado por vencimiento más próximo primero.
   */
  expiringMembers: Array<{
    memberId: string;
    memberName: string;
    planName: string;
    endDate: string;
  }>;
  /**
   * Cantidad total de members (no eliminados), sin importar el estado de su
   * membresía — a diferencia de activeMembers. Sirve solo para distinguir
   * "gimnasio recién creado, todavía sin cargar nada" de "gimnasio con
   * socios pero ninguno activo ahora mismo"; la página usa esto para decidir
   * si mostrar el estado de bienvenida en vez de 4 tarjetas en cero.
   */
  totalMembers: number;
  /**
   * Los últimos movimientos reales del gimnasio (altas, pagos, check-ins),
   * mezclados en una sola línea de tiempo. Es lo que le da pulso al
   * dashboard más allá de los 4 números — sin esto, un día con actividad
   * real se ve exactamente igual que un día sin nada.
   */
  recentActivity: Array<
    | { type: "checkin"; memberName: string; at: Date }
    | { type: "payment"; memberName: string; amount: number; at: Date }
    | { type: "new_member"; memberName: string; at: Date }
  >;
  /**
   * Variación de revenueThisMonth contra el mes calendario anterior, en
   * puntos porcentuales redondeados. null cuando el mes anterior no tuvo
   * ingresos "paid" — dividir por cero ahí daría un número sin sentido
   * (o Infinity), así que la UI debe ocultar la tendencia en ese caso en
   * vez de mostrar "+Infinity%" o "+100%" engañoso.
   */
  revenueTrendPct: number | null;
  /**
   * Check-ins por día de los últimos 7 días (hoy inclusive), ordenados de
   * más viejo a más nuevo. Alimenta el sparkline del dashboard — mismos
   * checkins que ya cuenta checkinsToday, solo agrupados por día.
   */
  checkinsLast7Days: Array<{ date: string; label: string; count: number }>;
  /**
   * Los socios con más check-ins en el mes calendario actual, de mayor a
   * menor. Vacío si todavía no hubo check-ins este mes.
   */
  topMembersByCheckins: Array<{ memberId: string; memberName: string; count: number }>;
}

// All calendar-day/month boundaries below are computed in UTC — same
// convention as lib/memberships/status.ts's hasPassed() and
// lib/memberships/renewal.ts's date math — so the server's local timezone
// can't shift which day/month "today"/"this month" resolve to.

function startOfMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfNextMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

function startOfDayUTC(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function dateOnlyString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Computes the owner dashboard's 4 headline metrics (app/(owner)/dashboard)
 * in a single tenant-scoped transaction. No historical trends, no charts —
 * by design (see the phase spec), just these four numbers as of `now`.
 */
export async function getDashboardMetrics(
  tenantId: string,
  role: TenantRole,
  now: Date = new Date(),
): Promise<DashboardMetrics> {
  const monthStart = startOfMonthUTC(now);
  const nextMonthStart = startOfNextMonthUTC(now);
  const todayStart = startOfDayUTC(now);
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const todayStr = dateOnlyString(todayStart);
  const in7DaysStr = dateOnlyString(
    new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000),
  );

  return withTenantContext(tenantId, role, async (tx) => {
    const [{ total }] = await tx
      .select({
        total: sql<string>`coalesce(sum(${schema.payments.amount}), 0)`,
      })
      .from(schema.payments)
      .where(
        and(
          eq(schema.payments.status, "paid"),
          gte(schema.payments.createdAt, monthStart),
          lt(schema.payments.createdAt, nextMonthStart),
        ),
      );

    // "Socios activos": each non-deleted member's CURRENT membership (most
    // recent by startDate/createdAt — see getCurrentMembership) has to have
    // effective status "active", not just any membership row ever marked
    // active. Fetched as two flat queries + joined in JS rather than one SQL
    // query, since "current membership per member" is exactly the
    // getCurrentEffectiveStatus logic this app already centralizes in
    // lib/memberships/status.ts — duplicating that as SQL would be the kind
    // of "reinvent the calculation" the phase spec explicitly warns against.
    const memberRows = await tx
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(isNull(schema.members.deletedAt));

    const membershipRows = await tx
      .select({
        memberId: schema.memberships.memberId,
        status: schema.memberships.status,
        startDate: schema.memberships.startDate,
        endDate: schema.memberships.endDate,
        createdAt: schema.memberships.createdAt,
      })
      .from(schema.memberships);

    const membershipsByMember = new Map<string, typeof membershipRows>();
    for (const membership of membershipRows) {
      const list = membershipsByMember.get(membership.memberId) ?? [];
      list.push(membership);
      membershipsByMember.set(membership.memberId, list);
    }

    const activeMembers = memberRows.reduce((count, member) => {
      const memberships = membershipsByMember.get(member.id) ?? [];
      return getCurrentEffectiveStatus(memberships, now) === "active"
        ? count + 1
        : count;
    }, 0);

    const expiringRows = await tx
      .select({
        memberId: schema.members.id,
        firstName: schema.members.firstName,
        lastName: schema.members.lastName,
        planName: schema.plans.name,
        endDate: schema.memberships.endDate,
      })
      .from(schema.memberships)
      .innerJoin(schema.members, eq(schema.memberships.memberId, schema.members.id))
      .innerJoin(schema.plans, eq(schema.memberships.planId, schema.plans.id))
      .where(
        and(
          eq(schema.memberships.status, "active"),
          gte(schema.memberships.endDate, todayStr),
          lte(schema.memberships.endDate, in7DaysStr),
        ),
      )
      .orderBy(schema.memberships.endDate);

    const expiringMembers = expiringRows.map((row) => ({
      memberId: row.memberId,
      memberName: `${row.firstName} ${row.lastName}`,
      planName: row.planName,
      // Non-null: the WHERE clause above only matches rows whose endDate
      // falls within [today, today+7d] — Drizzle's column type is nullable
      // in general (memberships.endDate has no NOT NULL constraint), but
      // that range comparison can't match a NULL row.
      endDate: row.endDate as string,
    }));

    const [{ count: checkinsToday }] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.checkins)
      .where(
        and(
          gte(schema.checkins.timestamp, todayStart),
          lt(schema.checkins.timestamp, tomorrowStart),
        ),
      );

    // Actividad reciente: los últimos N eventos de cada tipo, mezclados y
    // recortados a los 8 más nuevos en JS — más simple y legible que un
    // UNION en SQL para 3 tablas con formas distintas, y este dashboard no
    // corre con volumen donde la diferencia de performance importe.
    const RECENT_LIMIT = 8;

    const recentCheckins = await tx
      .select({
        firstName: schema.members.firstName,
        lastName: schema.members.lastName,
        at: schema.checkins.timestamp,
      })
      .from(schema.checkins)
      .innerJoin(schema.members, eq(schema.checkins.memberId, schema.members.id))
      .orderBy(desc(schema.checkins.timestamp))
      .limit(RECENT_LIMIT);

    const recentPayments = await tx
      .select({
        firstName: schema.members.firstName,
        lastName: schema.members.lastName,
        amount: schema.payments.amount,
        at: schema.payments.createdAt,
      })
      .from(schema.payments)
      .innerJoin(schema.members, eq(schema.payments.memberId, schema.members.id))
      .where(eq(schema.payments.status, "paid"))
      .orderBy(desc(schema.payments.createdAt))
      .limit(RECENT_LIMIT);

    const recentMembers = await tx
      .select({
        firstName: schema.members.firstName,
        lastName: schema.members.lastName,
        at: schema.members.createdAt,
      })
      .from(schema.members)
      .where(isNull(schema.members.deletedAt))
      .orderBy(desc(schema.members.createdAt))
      .limit(RECENT_LIMIT);

    const recentActivity = [
      ...recentCheckins.map((row) => ({
        type: "checkin" as const,
        memberName: `${row.firstName} ${row.lastName}`,
        at: row.at,
      })),
      ...recentPayments.map((row) => ({
        type: "payment" as const,
        memberName: `${row.firstName} ${row.lastName}`,
        amount: Number(row.amount),
        at: row.at,
      })),
      ...recentMembers.map((row) => ({
        type: "new_member" as const,
        memberName: `${row.firstName} ${row.lastName}`,
        at: row.at,
      })),
    ]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, RECENT_LIMIT);

    // Tendencia de ingresos: mismo cálculo que revenueThisMonth pero para
    // el mes calendario anterior completo.
    const lastMonthStart = new Date(
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() - 1, 1),
    );
    const [{ total: lastMonthTotal }] = await tx
      .select({
        total: sql<string>`coalesce(sum(${schema.payments.amount}), 0)`,
      })
      .from(schema.payments)
      .where(
        and(
          eq(schema.payments.status, "paid"),
          gte(schema.payments.createdAt, lastMonthStart),
          lt(schema.payments.createdAt, monthStart),
        ),
      );
    const lastMonthTotalNum = Number(lastMonthTotal);
    const revenueTrendPct =
      lastMonthTotalNum > 0
        ? Math.round(((Number(total) - lastMonthTotalNum) / lastMonthTotalNum) * 100)
        : null;

    // Check-ins de los últimos 7 días (hoy inclusive), agrupados por día en
    // JS — 7 filas siempre, aunque un día no tenga check-ins.
    const sevenDaysAgoStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    const last7DaysCheckinRows = await tx
      .select({ timestamp: schema.checkins.timestamp })
      .from(schema.checkins)
      .where(
        and(
          gte(schema.checkins.timestamp, sevenDaysAgoStart),
          lt(schema.checkins.timestamp, tomorrowStart),
        ),
      );

    // timeZone: "UTC" mantiene el label del día alineado con dateOnlyString
    // (que también trabaja en UTC) — sin esto, el nombre del día podía
    // desalinearse de la fecha real según la zona horaria del servidor.
    const weekdayFormatter = new Intl.DateTimeFormat("es-AR", {
      weekday: "short",
      timeZone: "UTC",
    });

    const checkinCountByDate = new Map<string, number>();
    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgoStart.getTime() + i * 24 * 60 * 60 * 1000);
      checkinCountByDate.set(dateOnlyString(date), 0);
    }
    for (const row of last7DaysCheckinRows) {
      const key = dateOnlyString(row.timestamp);
      checkinCountByDate.set(key, (checkinCountByDate.get(key) ?? 0) + 1);
    }
    const checkinsLast7Days = Array.from(checkinCountByDate.entries()).map(
      ([date, count]) => ({
        date,
        label: weekdayFormatter.format(new Date(`${date}T00:00:00Z`)).replace(".", "").toUpperCase(),
        count,
      }),
    );

    // Top socios por check-ins del mes calendario actual.
    const topMembersRows = await tx
      .select({
        memberId: schema.checkins.memberId,
        firstName: schema.members.firstName,
        lastName: schema.members.lastName,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.checkins)
      .innerJoin(schema.members, eq(schema.checkins.memberId, schema.members.id))
      .where(
        and(
          gte(schema.checkins.timestamp, monthStart),
          lt(schema.checkins.timestamp, nextMonthStart),
        ),
      )
      .groupBy(schema.checkins.memberId, schema.members.firstName, schema.members.lastName)
      .orderBy(desc(sql`count(*)`))
      .limit(4);

    const topMembersByCheckins = topMembersRows.map((row) => ({
      memberId: row.memberId,
      memberName: `${row.firstName} ${row.lastName}`,
      count: row.count,
    }));

    return {
      revenueThisMonth: Number(total),
      activeMembers,
      expiringIn7Days: expiringMembers.length,
      checkinsToday,
      expiringMembers,
      totalMembers: memberRows.length,
      recentActivity,
      revenueTrendPct,
      checkinsLast7Days,
      topMembersByCheckins,
    };
  });
}
