"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Member } from "@/db/schema/members";
import type { EffectiveMembershipStatus } from "@/lib/memberships/status";
import {
  MEMBERSHIP_STATUS_LABELS,
  MEMBERSHIP_STATUS_TONES,
} from "@/lib/memberships/status-presentation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/status-pill";
import { cn } from "@/lib/utils";
import styles from "./index.module.css";

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
});

interface OpenCheckin {
  id: string;
  memberId: string;
  timestamp: string;
}

type CheckinResult =
  | { kind: "success"; action: "checkin" | "checkout"; member: Member; timestamp: string }
  // `member` is null only for the self-code flow when the code itself
  // doesn't resolve to anyone (T-20260825-004) — the name-based flow
  // always has a member (staff picked it from the list before calling).
  | { kind: "error"; action: "checkin" | "checkout"; member: Member | null; message: string };

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
  const [members, setMembers] = useState<Member[]>([]);
  const [statusByMember, setStatusByMember] = useState<
    Record<string, EffectiveMembershipStatus>
  >({});
  const [openCheckins, setOpenCheckins] = useState<OpenCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [result, setResult] = useState<CheckinResult | null>(null);
  // Self-service auto-check-in by code (T-20260825-004) — an alternate
  // input mode alongside the name search above, not a separate screen
  // (see the endpoint's docstring for the authenticated-session scope
  // decision).
  const [code, setCode] = useState("");
  const [codePending, setCodePending] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [membersRes, statusRes] = await Promise.all([
        fetch("/api/v1/members"),
        fetch("/api/v1/memberships?statusSummary=true"),
      ]);
      if (!membersRes.ok) {
        setLoadError("No se pudieron cargar los socios");
        return;
      }
      const data: Member[] = await membersRes.json();
      setMembers(data);

      const summary: Record<string, EffectiveMembershipStatus> = statusRes.ok
        ? await statusRes.json()
        : {};
      setStatusByMember(summary);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOpenCheckins = useCallback(async () => {
    const res = await fetch("/api/v1/checkins?open=true");
    if (res.ok) {
      const data: OpenCheckin[] = await res.json();
      setOpenCheckins(data);
    }
  }, []);

  useEffect(() => {
    loadMembers();
    loadOpenCheckins();
  }, [loadMembers, loadOpenCheckins]);

  const openByMemberId = useMemo(
    () => new Map(openCheckins.map((c) => [c.memberId, c])),
    [openCheckins],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (member) =>
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(q) ||
        member.shortCode.toLowerCase().includes(q),
    );
  }, [members, query]);

  const insideNow = useMemo(
    () =>
      openCheckins
        .slice()
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [openCheckins],
  );

  async function handleCheckin(member: Member) {
    setPendingId(member.id);
    setResult(null);
    try {
      const res = await fetch("/api/v1/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setResult({
          kind: "error",
          action: "checkin",
          member,
          message:
            typeof body?.error === "string"
              ? body.error
              : "No se pudo registrar el check-in",
        });
        return;
      }

      const checkin = (await res.json()) as { id: string; timestamp: string };
      setOpenCheckins((prev) => [
        ...prev,
        { id: checkin.id, memberId: member.id, timestamp: checkin.timestamp },
      ]);
      setResult({ kind: "success", action: "checkin", member, timestamp: checkin.timestamp });
    } finally {
      setPendingId(null);
    }
  }

  async function handleCheckout(member: Member) {
    const open = openByMemberId.get(member.id);
    if (!open) return;

    setPendingId(member.id);
    setResult(null);
    try {
      const res = await fetch(`/api/v1/checkins/${open.id}`, { method: "PATCH" });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setResult({
          kind: "error",
          action: "checkout",
          member,
          message:
            typeof body?.error === "string"
              ? body.error
              : "No se pudo registrar el check-out",
        });
        return;
      }

      const checkin = (await res.json()) as { checkedOutAt: string };
      setOpenCheckins((prev) => prev.filter((c) => c.id !== open.id));
      setResult({
        kind: "success",
        action: "checkout",
        member,
        timestamp: checkin.checkedOutAt,
      });
    } finally {
      setPendingId(null);
    }
  }

  async function handleSelfCheckin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length !== 6) return;

    setCodePending(true);
    setResult(null);
    try {
      const res = await fetch("/api/v1/checkins/self", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setResult({
          kind: "error",
          action: "checkin",
          member: (body?.member as Member | undefined) ?? null,
          message:
            typeof body?.error === "string"
              ? body.error
              : "No se pudo registrar el check-in",
        });
        return;
      }

      const { member, checkin } = body as { member: Member; checkin: { id: string; timestamp: string } };
      setOpenCheckins((prev) => [
        ...prev,
        { id: checkin.id, memberId: member.id, timestamp: checkin.timestamp },
      ]);
      // The self-code flow can resolve a member that isn't in the
      // client's already-loaded `members` list yet (e.g. created after
      // this page loaded) — merge it in so "En el gym ahora" can render
      // their name instead of falling back to "Socio".
      setMembers((prev) => (prev.some((m) => m.id === member.id) ? prev : [...prev, member]));
      setResult({ kind: "success", action: "checkin", member, timestamp: checkin.timestamp });
    } finally {
      setCode("");
      setCodePending(false);
    }
  }

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
