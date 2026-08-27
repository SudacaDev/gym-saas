"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { Member } from "@/db/schema/members";
import type { EffectiveMembershipStatus } from "@/lib/memberships/status";

/** One row of GET /api/v1/checkins?today=true — see that route's docstring. */
export interface CheckinFeedItem {
  id: string;
  memberId: string;
  timestamp: string;
  checkedOutAt: string | null;
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
 *
 * `feed` (today's check-ins, open AND closed — T-20260826-015's "feed en
 * vivo" column) is the single source of truth this hook fetches; `open`/
 * "who's inside now" is derived from it client-side instead of a second
 * fetch, since ?today=true is already a superset of ?open=true for the
 * same day (see app/api/v1/checkins/route.ts's docstring).
 */
export const useCheckin = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [statusByMember, setStatusByMember] = useState<
    Record<string, EffectiveMembershipStatus>
  >({});
  const [feed, setFeed] = useState<CheckinFeedItem[]>([]);
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

  const loadFeed = useCallback(async () => {
    const res = await fetch("/api/v1/checkins?today=true");
    if (res.ok) {
      const data: CheckinFeedItem[] = await res.json();
      setFeed(data);
    }
  }, []);

  useEffect(() => {
    loadMembers();
    loadFeed();
  }, [loadMembers, loadFeed]);

  const openByMemberId = useMemo(
    () => new Map(feed.filter((c) => !c.checkedOutAt).map((c) => [c.memberId, c])),
    [feed],
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
      setFeed((prev) => [
        { id: checkin.id, memberId: member.id, timestamp: checkin.timestamp, checkedOutAt: null },
        ...prev,
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
      setFeed((prev) =>
        prev.map((c) => (c.id === open.id ? { ...c, checkedOutAt: checkin.checkedOutAt } : c)),
      );
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
      setFeed((prev) => [
        { id: checkin.id, memberId: member.id, timestamp: checkin.timestamp, checkedOutAt: null },
        ...prev,
      ]);
      // The self-code flow can resolve a member that isn't in the
      // client's already-loaded `members` list yet (e.g. created after
      // this page loaded) — merge it in so the feed/list can render their
      // name instead of falling back to "Socio".
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
  };
};
