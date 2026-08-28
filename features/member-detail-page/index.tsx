"use client";

import Link from "next/link";
import type { Payment } from "@/db/schema/payments";
import type { EmailSendLog } from "@/db/schema/email-send-log";
import { getEffectiveStatus } from "@/lib/memberships/status";
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
import { MemberDetailSkeleton } from "./components/member-detail-skeleton";
import styles from "./index.module.css";
import { useMemberDetail } from "./hooks/useMemberDetail";

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
  const {
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
  } = useMemberDetail();

  if (loading) {
    return <MemberDetailSkeleton />;
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
                const isChangingThis = statusChange?.membershipId === membership.id;
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
                              disabled={isChangingThis}
                              onClick={() =>
                                handleStatusChange(membership, "active")
                              }
                            >
                              {isChangingThis && statusChange?.status === "active"
                                ? "Reactivando..."
                                : "Reactivar"}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isChangingThis}
                              onClick={() =>
                                handleStatusChange(membership, "paused")
                              }
                            >
                              {isChangingThis && statusChange?.status === "paused"
                                ? "Pausando..."
                                : "Pausar"}
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={isChangingThis}
                            onClick={() =>
                              handleStatusChange(membership, "cancelled")
                            }
                          >
                            {isChangingThis && statusChange?.status === "cancelled"
                              ? "Cancelando..."
                              : "Cancelar"}
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
