"use client";

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
import type { Lead } from "@/db/schema/leads";
import { LeadFormDialog } from "./components/lead-form-dialog";
import styles from "./index.module.css";
import { useLeads } from "./hooks/useLeads";

const STATUS_LABELS: Record<Lead["status"], string> = {
  nuevo: "Nuevo",
  convertido: "Convertido",
  perdido: "Perdido",
};

const STATUS_TONES: Record<Lead["status"], StatusPillTone> = {
  nuevo: "info",
  convertido: "success",
  perdido: "danger",
};

// wa.me needs digits only (country code + number, no symbols/spaces) — this
// just strips everything else from whatever staff typed, best-effort, no
// validation of a "real" phone number (out of scope, see lead.schema.ts).
function waLink(whatsapp: string): string {
  return `https://wa.me/${whatsapp.replace(/\D/g, "")}`;
}

/**
 * Captura de leads (T-20260826-013) — prospecto pregunta en el mostrador,
 * staff carga nombre + WhatsApp, arranca en "Nuevo". Sin automatizaciones
 * de seguimiento (WhatsApp/email) en esta primera vuelta — el link a
 * wa.me abajo es solo un atajo para que el humano escriba manualmente, no
 * un envío automático. Owner+staff pueden cargar/ver/cambiar estado —
 * mismo criterio que otras pantallas operativas (checkin, kiosk, schedules).
 */
export function LeadsPage() {
  const { leads, loading, error, updatingId, handleCreated, handleStatusChange } = useLeads();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Prospectos</h1>
        <LeadFormDialog trigger={<Button>Nuevo prospecto</Button>} onSaved={handleCreated} />
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      {loading ? (
        <p className={styles.emptyText}>Cargando...</p>
      ) : leads.length === 0 ? (
        <p className={styles.emptyText}>Todavía no hay prospectos cargados.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Nota</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className={styles.actionsHead}>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>{lead.name}</TableCell>
                <TableCell>
                  <a
                    href={waLink(lead.whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.whatsappLink}
                  >
                    {lead.whatsapp}
                  </a>
                </TableCell>
                <TableCell className={styles.noteCell}>{lead.note ?? "—"}</TableCell>
                <TableCell>{new Date(lead.createdAt).toLocaleDateString("es-AR")}</TableCell>
                <TableCell>
                  <StatusPill tone={STATUS_TONES[lead.status]}>
                    {STATUS_LABELS[lead.status]}
                  </StatusPill>
                </TableCell>
                <TableCell>
                  <div className={styles.actions}>
                    {lead.status !== "convertido" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updatingId === lead.id}
                        onClick={() => handleStatusChange(lead, "convertido")}
                      >
                        Convertido
                      </Button>
                    )}
                    {lead.status !== "perdido" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={updatingId === lead.id}
                        onClick={() => handleStatusChange(lead, "perdido")}
                      >
                        Perdido
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
