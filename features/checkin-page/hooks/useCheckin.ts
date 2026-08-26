"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Member } from "@/db/schema/members";
import type { EffectiveMembershipStatus } from "@/lib/memberships/status";

interface OpenCheckin {
  id: string;
  memberId: string;
  timestamp: string;
}

export type CheckinResult =
  | { kind: "success"; action: "checkin" | "checkout"; member: Member; timestamp: string }
  // `member` is null only for the self-code flow when the code itself
  // doesn't resolve to anyone (T-20260825-004) — the name-based flow
  // always has a member (staff picked it from the list before calling).
  | { kind: "error"; action: "checkin" | "checkout"; member: Member | null; message: string };

/**
 * Front-desk check-in screen state/logic: search a member, confirm they're
 * up to date, one tap to log the visit — and one tap to log the checkout
 * once they're done. See lib/memberships/status.ts for what "estado" means
 * here; the POST/PATCH themselves re-check server-side (this client-side
 * status is only to guide staff, never trusted as the actual gate).
 */
export const useCheckin = () => {
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

  return {
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
  };
};
