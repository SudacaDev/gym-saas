"use client";

import {
  MEMBERSHIP_STATUS_LABELS,
  MEMBERSHIP_STATUS_TONES,
} from "@/lib/memberships/status-presentation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/status-pill";
import { cn } from "@/lib/utils";
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
 * Front-desk check-in screen: search a member, confirm they're up to date,
 * one tap to log the visit — and one tap to log the checkout once they're
 * done. Built for someone standing at the counter with a phone/tablet — big
 * touch targets, a big pass/fail banner, no form to fill in. See
 * lib/memberships/status.ts for what "estado" means here; the POST/PATCH
 * themselves re-check server-side (this client-side status is only to
 * guide staff, never trusted as the actual gate).
 */
export function CheckinPage() {
  const {
    members,
    statusByMember,
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
    insideNow,
    openByMemberId,
    handleCheckin,
    handleCheckout,
    handleSelfCheckin,
  } = useCheckin();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        Check-in
      </h1>

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

      {insideNow.length > 0 && (
        <div className={styles.insidePanel}>
          <div className={styles.insidePanelHeader}>
            <h2 className={styles.insidePanelTitle}>En el gym ahora</h2>
            <span className={styles.insidePanelCount}>{insideNow.length}</span>
          </div>
          <ul className={styles.insideList}>
            {insideNow.map((c) => {
              const member = members.find((m) => m.id === c.memberId);
              return (
                <li key={c.id} className={styles.insideRow}>
                  <span className={styles.insideName}>
                    {member ? `${member.firstName} ${member.lastName}` : "Socio"}
                    {member && (
                      <span className={styles.memberShortCode}> · {member.shortCode}</span>
                    )}
                  </span>
                  <span className={styles.insideTime}>
                    {timeFormatter.format(new Date(c.timestamp))}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <form onSubmit={handleSelfCheckin} className={styles.codeForm}>
        <Input
          inputMode="numeric"
          placeholder="Código de 6 dígitos del socio"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          className={styles.codeInput}
        />
        <Button type="submit" size="lg" disabled={code.length !== 6 || codePending}>
          {codePending ? "Verificando..." : "Check-in por código"}
        </Button>
      </form>

      <Input
        placeholder="Buscar socio por nombre, apellido o código..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={styles.searchInput}
        autoFocus
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
              <li
                key={member.id}
                className={styles.listItem}
              >
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
                  size="lg"
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
    </div>
  );
}
