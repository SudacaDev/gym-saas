"use client";

import {
  MEMBERSHIP_STATUS_LABELS,
  MEMBERSHIP_STATUS_TONES,
} from "@/lib/memberships/status-presentation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/status-pill";
import { cn } from "@/lib/utils";
import { relativeTime } from "./lib/relative-time";
import { CurrentClassColumn } from "./components/current-class-column";
import { QuickSaleColumn } from "./components/quick-sale-column";
import styles from "./index.module.css";
import { useCheckin, type CheckinResult } from "./hooks/useCheckin";

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
});

const RESULT_TITLES: Record<CheckinResult["kind"], Record<CheckinResult["action"], string>> = {
  success: { checkin: "Check-in registrado", checkout: "Check-out registrado" },
  error: { checkin: "No se pudo registrar el check-in", checkout: "No se pudo registrar el check-out" },
};

/**
 * Front-desk operations screen (T-20260826-015 redesign): three columns —
 * feed en vivo (check-in de socios + actividad reciente), clase actual
 * (cupo/lista de espera de la clase en curso), punto de venta rápido —
 * adapting the 3-column structure/order a reference SaaS screenshot showed
 * the user, kept in BoxFlow's own Volt/dark/pill visual language (not the
 * reference's visual style, only its column order). Built for someone
 * standing at the counter with a phone/tablet — big touch targets, no
 * multi-step forms. See lib/memberships/status.ts for what "estado" means
 * here; the POST/PATCH themselves re-check server-side (this client-side
 * status is only to guide staff, never trusted as the actual gate).
 *
 * Column 1 keeps every bit of the original single-column check-in screen's
 * behavior (self-code entry, name search, checkin/checkout) — this task
 * didn't ask to remove or relocate that, "feed en vivo" is this same
 * column's action tool plus a live activity feed of today's check-ins
 * (open AND closed, most recent first, relative timestamps) replacing the
 * old "En el gym ahora" (open-only) panel. Columns 2/3 are new
 * (useCurrentClass/useQuickSale, see their own docstrings).
 */
export function CheckinPage() {
  const {
    members,
    statusByMember,
    feed,
    loading,
    loadError,
    query,
    setQuery,
    pendingId,
    result,
    code,
    setCode,
    codePending,
    filtered,
    openByMemberId,
    handleCheckin,
    handleCheckout,
    handleSelfCheckin,
  } = useCheckin();

  const now = new Date();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Check-in</h1>

      {result && (
        <div
          role="status"
          className={cn(
            styles.resultBanner,
            result.kind === "success"
              ? styles.resultBannerSuccess
              : styles.resultBannerError
          )}
        >
          <p
            className={cn(
              styles.resultTitle,
              result.kind === "success" ? styles.resultTitleSuccess : styles.resultTitleError
            )}
          >
            {RESULT_TITLES[result.kind][result.action]}
          </p>
          <p className={styles.resultMessage}>
            {result.member ? `${result.member.firstName} ${result.member.lastName}` : "Código no encontrado"}
            {" — "}
            {result.kind === "success"
              ? timeFormatter.format(new Date(result.timestamp))
              : result.message}
          </p>
        </div>
      )}

      <div className={styles.columns}>
        <section className={styles.column} aria-label="Feed en vivo">
          <h2 className={styles.columnTitle}>Feed en vivo</h2>

          <form onSubmit={handleSelfCheckin} className={styles.codeForm}>
            <Input
              inputMode="numeric"
              placeholder="Código de 6 dígitos del socio"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className={styles.codeInput}
            />
            <Button type="submit" disabled={code.length !== 6 || codePending}>
              {codePending ? "Verificando..." : "Check-in por código"}
            </Button>
          </form>

          <Input
            placeholder="Buscar socio por nombre, apellido o código..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={styles.searchInput}
          />

          {loadError && <p className={styles.errorText}>{loadError}</p>}

          {loading ? (
            <p className={styles.emptyText}>Cargando...</p>
          ) : filtered.length === 0 ? (
            <p className={styles.emptyText}>
              {members.length === 0 ? "Todavía no hay socios." : "Sin resultados."}
            </p>
          ) : (
            <ul className={styles.list}>
              {filtered.map((member) => {
                const status = statusByMember[member.id] ?? "none";
                const open = openByMemberId.get(member.id);
                return (
                  <li key={member.id} className={styles.listItem}>
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName}>
                        {member.firstName} {member.lastName}
                      </span>
                      <span className={styles.memberShortCode}>{member.shortCode}</span>
                      <StatusPill tone={MEMBERSHIP_STATUS_TONES[status]}>
                        {MEMBERSHIP_STATUS_LABELS[status]}
                      </StatusPill>
                      {open && (
                        <StatusPill tone="info">
                          En el gym · {timeFormatter.format(new Date(open.timestamp))}
                        </StatusPill>
                      )}
                    </div>
                    <Button
                      variant={open ? "secondary" : status === "active" ? "default" : "outline"}
                      disabled={pendingId === member.id}
                      onClick={() => (open ? handleCheckout(member) : handleCheckin(member))}
                    >
                      {pendingId === member.id
                        ? "Registrando..."
                        : open
                          ? "Check-out"
                          : "Check-in"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className={styles.feedPanel}>
            <div className={styles.feedPanelHeader}>
              <span className={styles.feedPanelTitle}>Actividad de hoy</span>
              <span className={styles.feedPanelCount}>{feed.length}</span>
            </div>
            {feed.length === 0 ? (
              <p className={styles.emptyText}>Todavía no hay check-ins hoy.</p>
            ) : (
              <ul className={styles.feedList}>
                {feed.map((c) => {
                  const member = members.find((m) => m.id === c.memberId);
                  const name = member ? `${member.firstName} ${member.lastName}` : "Socio";
                  return (
                    <li key={c.id} className={styles.feedRow}>
                      <span className={styles.feedName}>
                        {name}
                        {member && (
                          <span className={styles.memberShortCode}> · {member.shortCode}</span>
                        )}
                      </span>
                      <span className={styles.feedMeta}>
                        {c.checkedOutAt ? (
                          `Salió ${relativeTime(new Date(c.checkedOutAt), now)}`
                        ) : (
                          <StatusPill tone="info">
                            En el gym · {relativeTime(new Date(c.timestamp), now)}
                          </StatusPill>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <CurrentClassColumn />

        <QuickSaleColumn />
      </div>
    </div>
  );
}
