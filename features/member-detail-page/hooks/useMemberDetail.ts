"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { Member } from "@/db/schema/members";
import type { Membership } from "@/db/schema/memberships";
import type { Plan } from "@/db/schema/plans";
import type { Payment } from "@/db/schema/payments";
import type { Checkin } from "@/db/schema/checkins";
import type { EmailSendLog } from "@/db/schema/email-send-log";
import { getCurrentMembership } from "@/lib/memberships/status";

export const useMemberDetail = () => {
  const params = useParams<{ memberId: string }>();
  const memberId = params.memberId;

  const [member, setMember] = useState<Member | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [reminderLog, setReminderLog] = useState<EmailSendLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusActionError, setStatusActionError] = useState<string | null>(
    null,
  );
  // Tracks which membership row has a status-change PATCH in flight, and
  // which target status it's headed to — lets the row disable both of its
  // buttons and swap the pressed one's label to a "-ing" form (same pattern
  // as `sendingReminder` below) instead of giving no feedback while the
  // request is out.
  const [statusChange, setStatusChange] = useState<{
    membershipId: string;
    status: Membership["status"];
  } | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState(false);

  const loadMember = useCallback(async () => {
    const res = await fetch(`/api/v1/members/${memberId}`);
    if (res.ok) setMember(await res.json());
  }, [memberId]);

  const loadMemberships = useCallback(async () => {
    const res = await fetch(`/api/v1/memberships?memberId=${memberId}`);
    if (res.ok) setMemberships(await res.json());
  }, [memberId]);

  const loadPlans = useCallback(async () => {
    const res = await fetch("/api/v1/plans");
    if (res.ok) setPlans(await res.json());
  }, []);

  const loadCheckins = useCallback(async () => {
    const res = await fetch(`/api/v1/checkins?memberId=${memberId}`);
    if (res.ok) setCheckins(await res.json());
  }, [memberId]);

  const loadReminderLog = useCallback(async () => {
    const res = await fetch(`/api/v1/email-send-log?memberId=${memberId}`);
    if (res.ok) setReminderLog(await res.json());
  }, [memberId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      loadMember(),
      loadMemberships(),
      loadPlans(),
      loadCheckins(),
      loadReminderLog(),
    ]).finally(() => setLoading(false));
  }, [loadMember, loadMemberships, loadPlans, loadCheckins, loadReminderLog]);

  const planById = useMemo(() => {
    const map = new Map<string, Plan>();
    for (const plan of plans) map.set(plan.id, plan);
    return map;
  }, [plans]);

  // The membership that matters for "is this member up to date" — see
  // lib/memberships/status.ts's docstring. Its payments are what the
  // "Pagos" section below shows.
  const currentMembership = useMemo(
    () => getCurrentMembership(memberships),
    [memberships],
  );

  const loadPayments = useCallback(async (membershipId: string) => {
    const res = await fetch(`/api/v1/payments?membershipId=${membershipId}`);
    if (res.ok) setPayments(await res.json());
  }, []);

  useEffect(() => {
    if (currentMembership) {
      loadPayments(currentMembership.id);
    } else {
      setPayments([]);
    }
  }, [currentMembership, loadPayments]);

  function handleMembershipSaved(saved: Membership) {
    setError(null);
    setMemberships((prev) => [saved, ...prev]);
  }

  function handlePaymentSaved() {
    setError(null);
    // The payment extends the membership's endDate server-side — refetch
    // both so the displayed vencimiento and receipt list stay in sync
    // instead of hand-patching local state.
    loadMemberships();
    if (currentMembership) loadPayments(currentMembership.id);
  }

  async function handleStatusChange(
    membership: Membership,
    status: Membership["status"],
  ) {
    setStatusActionError(null);
    setStatusChange({ membershipId: membership.id, status });
    try {
      const res = await fetch(`/api/v1/memberships/${membership.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setStatusActionError(
          typeof body?.error === "string"
            ? body.error
            : "No se pudo actualizar el estado de la membresía",
        );
        return;
      }
      const updated = (await res.json()) as Membership;
      setMemberships((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
    } finally {
      setStatusChange(null);
    }
  }

  async function handleSendReminder() {
    if (!currentMembership) return;
    setReminderError(null);
    setSendingReminder(true);
    try {
      const res = await fetch(
        `/api/v1/memberships/${currentMembership.id}/send-reminder`,
        { method: "POST" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setReminderError(
          typeof body?.error === "string"
            ? body.error
            : "No se pudo enviar el recordatorio",
        );
        return;
      }
      await loadReminderLog();
    } finally {
      setSendingReminder(false);
    }
  }

  return {
    memberId,
    member,
    memberships,
    plans,
    payments,
    checkins,
    reminderLog,
    loading,
    error,
    statusActionError,
    statusChange,
    reminderError,
    sendingReminder,
    planById,
    currentMembership,
    handleMembershipSaved,
    handlePaymentSaved,
    handleStatusChange,
    handleSendReminder,
  };
};
