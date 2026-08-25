"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Member } from "@/db/schema/members";
import type { Membership } from "@/db/schema/memberships";
import type { Plan } from "@/db/schema/plans";
import type { Payment } from "@/db/schema/payments";
import type { Checkin } from "@/db/schema/checkins";
import type { EmailSendLog } from "@/db/schema/email-send-log";
import {
  getCurrentMembership,
  getEffectiveStatus,
} from "@/lib/memberships/status";
import {
  MEMBERSHIP_STATUS_LABELS,
  MEMBERSHIP_STATUS_TONES,
} from "@/lib/memberships/status-presentation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusPill, type StatusPillTone } from "@/components/status-pill";
import { MembershipFormDialog } from "./components/membership-form-dialog";
import { PaymentFormDialog } from "./components/payment-form-dialog";
import styles from "./index.module.css";

const REMINDER_TYPE_LABELS: Record<EmailSendLog["type"], string> = {
  reminder: "Automático",
  manual: "Manual",
};

const REMINDER_STATUS_LABELS: Record<EmailSendLog["status"], string> = {
  sent: "Enviado",
  failed: "Falló",
};

const REMINDER_STATUS_TONES: Record<EmailSendLog["status"], StatusPillTone> = {
  sent: "success",
  failed: "danger",
};

const PAYMENT_STATUS_LABELS: Record<Payment["status"], string> = {
  pending: "Pendiente",
  paid: "Pagado",
  failed: "Fallido",
  refunded: "Reembolsado",
};

const PAYMENT_STATUS_TONES: Record<Payment["status"], StatusPillTone> = {
  paid: "success",
  pending: "alert",
  failed: "danger",
  refunded: "neutral",
};

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });
const timeOnlyFormatter = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateOnly(value: string | null): string {
  if (!value) return "—";
  // value is a plain "YYYY-MM-DD" date column — parse as UTC noon so no
  // local timezone can shift it back/forward a day when displayed.
  return dateFormatter.format(new Date(`${value}T12:00:00Z`));
}

function formatDateTime(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function MemberDetailPage() {
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

  if (loading) {
    return (
      <p className={styles.loadingText}>Cargando...</p>
    );
  }

  if (!member) {
    return (
      <div className={styles.notFoundContainer}>
        <p className={styles.errorText}>Socio no encontrado.</p>
        <Link href="/members" className={styles.simpleLink}>
          Volver a socios
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div>
        <Link
          href="/members"
          className={styles.backLink}
        >
          ← Volver a socios
        </Link>
        <h1 className={styles.title}>
          {member.firstName} {member.lastName}
        </h1>
        <dl className={styles.infoList}>
          <div>
            <dt className={styles.infoLabel}>Código: </dt>
            <dd className={styles.infoValue}>
              <span className={styles.shortCode}>{member.shortCode}</span>
            </dd>
          </div>
          <div>
            <dt className={styles.infoLabel}>Email: </dt>
            <dd className={styles.infoValue}>{member.email ?? "—"}</dd>
          </div>
          <div>
            <dt className={styles.infoLabel}>Teléfono: </dt>
            <dd className={styles.infoValue}>{member.phone ?? "—"}</dd>
          </div>
          <div>
            <dt className={styles.infoLabel}>Nacimiento: </dt>
            <dd className={styles.infoValue}>{formatDateOnly(member.birthDate)}</dd>
          </div>
          <div>
            <dt className={styles.infoLabel}>DNI: </dt>
            <dd className={styles.infoValue}>{member.dni ?? "—"}</dd>
          </div>
          <div>
            <dt className={styles.infoLabel}>Certificado médico: </dt>
            <dd className={styles.infoValue}>
              <StatusPill tone={member.medicalCertificateSubmitted ? "success" : "alert"}>
                {member.medicalCertificateSubmitted ? "Presentado" : "Pendiente"}
              </StatusPill>
            </dd>
          </div>
          {member.emailOptOut && (
            <div>
              <dt className={styles.infoLabel}>Recordatorios: </dt>
              <dd className={styles.infoValue}>
                <StatusPill tone="neutral">No recibe automáticos</StatusPill>
              </dd>
            </div>
          )}
          {member.healthNotes && (
            <div>
              <dt className={styles.infoLabel}>Salud: </dt>
              <dd className={styles.infoValue}>{member.healthNotes}</dd>
            </div>
          )}
        </dl>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Membresías</h2>
          <MembershipFormDialog
            trigger={<Button size="sm">Nueva membresía</Button>}
            memberId={memberId}
            plans={plans}
            onSaved={handleMembershipSaved}
          />
        </div>

        {statusActionError && (
          <p className={styles.errorText}>{statusActionError}</p>
        )}

        {memberships.length === 0 ? (
          <p className={styles.emptyText}>
            Este socio todavía no tiene membresías.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead className={styles.actionsHead}>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberships.map((membership) => {
                const effective = getEffectiveStatus(membership);
                const isCurrent = membership.id === currentMembership?.id;
                return (
                  <TableRow key={membership.id}>
                    <TableCell>
                      {planById.get(membership.planId)?.name ??
                        "Plan eliminado"}
                    </TableCell>
                    <TableCell>
                      <StatusPill tone={MEMBERSHIP_STATUS_TONES[effective]}>
                        {MEMBERSHIP_STATUS_LABELS[effective]}
                      </StatusPill>
                    </TableCell>
                    <TableCell>{formatDateOnly(membership.startDate)}</TableCell>
                    <TableCell>{formatDateOnly(membership.endDate)}</TableCell>
                    <TableCell>
                      {isCurrent && membership.status !== "cancelled" && (
                        <div className={styles.actions}>
                          {membership.status === "paused" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleStatusChange(membership, "active")
                              }
                            >
                              Reactivar
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleStatusChange(membership, "paused")
                              }
                            >
                              Pausar
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(membership, "cancelled")
                            }
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Pagos</h2>
          {currentMembership && (
            <PaymentFormDialog
              trigger={<Button size="sm">Registrar pago</Button>}
              membershipId={currentMembership.id}
              onSaved={handlePaymentSaved}
            />
          )}
        </div>

        {!currentMembership ? (
          <p className={styles.emptyText}>
            Dá de alta una membresía primero para poder registrar pagos.
          </p>
        ) : payments.length === 0 ? (
          <p className={styles.emptyText}>
            Todavía no hay pagos registrados para la membresía actual (
            {planById.get(currentMembership.planId)?.name ?? "plan actual"}).
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{formatDateTime(String(payment.createdAt))}</TableCell>
                  <TableCell>
                    {currencyFormatter.format(Number(payment.amount))}
                  </TableCell>
                  <TableCell>
                    <StatusPill tone={PAYMENT_STATUS_TONES[payment.status]}>
                      {PAYMENT_STATUS_LABELS[payment.status]}
                    </StatusPill>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Check-ins
        </h2>

        {checkins.length === 0 ? (
          <p className={styles.emptyText}>
            Este socio todavía no tiene check-ins registrados.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {checkins.map((checkin) => (
                <TableRow key={checkin.id}>
                  <TableCell>{formatDateTime(String(checkin.timestamp))}</TableCell>
                  <TableCell>
                    {timeOnlyFormatter.format(new Date(checkin.timestamp))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recordatorios</h2>
          {currentMembership && (
            <Button
              size="sm"
              onClick={handleSendReminder}
              disabled={sendingReminder}
            >
              {sendingReminder ? "Enviando..." : "Enviar recordatorio"}
            </Button>
          )}
        </div>

        {reminderError && <p className={styles.errorText}>{reminderError}</p>}

        {!currentMembership ? (
          <p className={styles.emptyText}>
            Dá de alta una membresía primero para poder enviar recordatorios.
          </p>
        ) : reminderLog.length === 0 ? (
          <p className={styles.emptyText}>
            Todavía no se envió ningún recordatorio a este socio.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reminderLog.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDateTime(String(entry.createdAt))}</TableCell>
                  <TableCell>{REMINDER_TYPE_LABELS[entry.type]}</TableCell>
                  <TableCell>
                    <StatusPill tone={REMINDER_STATUS_TONES[entry.status]}>
                      {REMINDER_STATUS_LABELS[entry.status]}
                    </StatusPill>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
