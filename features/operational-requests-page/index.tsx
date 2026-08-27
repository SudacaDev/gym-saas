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
import type { OperationalRequest } from "@/db/schema/operational-requests";
import { OperationalRequestFormDialog } from "./components/operational-request-form-dialog";
import styles from "./index.module.css";
import { useOperationalRequests, type OperationalRequestRow } from "./hooks/useOperationalRequests";

const CATEGORY_LABELS: Record<NonNullable<OperationalRequest["category"]>, string> = {
  supplies: "Insumos",
  maintenance: "Mantenimiento",
};

const STATUS_LABELS: Record<OperationalRequest["status"], string> = {
  open: "Abierto",
  resolved: "Resuelto",
};

const STATUS_TONES: Record<OperationalRequest["status"], StatusPillTone> = {
  open: "alert",
  resolved: "success",
};

function reporterName(request: OperationalRequestRow): string {
  const name = [request.reportedByFirstName, request.reportedByLastName]
    .filter(Boolean)
    .join(" ");
  return name || "—";
}

/**
 * Necesidades operativas (T-20260826-010) — administrativo reporta "faltan
 * elementos de limpieza", "esta máquina necesita mantenimiento". Sin flujo
 * de aprobación ni notificaciones (no se pidió — sería sobre-alcance). La
 * vista propia del owner para esto queda para más adelante, confirmado
 * explícitamente fuera de esta tarea. Owner+staff pueden cargar/ver/marcar
 * resuelto — mismo criterio que otras pantallas operativas (checkin,
 * kiosk, leads); no se restringe por staffCategory/department (ese eje es
 * T-20260826-014, no implementado todavía).
 */
export function OperationalRequestsPage() {
  const { requests, loading, error, updatingId, handleCreated, handleStatusChange } =
    useOperationalRequests();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Necesidades</h1>
        <OperationalRequestFormDialog
          trigger={<Button>Nueva necesidad</Button>}
          onSaved={handleCreated}
        />
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      {loading ? (
        <p className={styles.emptyText}>Cargando...</p>
      ) : requests.length === 0 ? (
        <p className={styles.emptyText}>Todavía no hay necesidades reportadas.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descripción</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Reportado por</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className={styles.actionsHead}>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className={styles.descriptionCell}>{request.description}</TableCell>
                <TableCell>
                  {request.category ? CATEGORY_LABELS[request.category] : "—"}
                </TableCell>
                <TableCell>{reporterName(request)}</TableCell>
                <TableCell>{new Date(request.createdAt).toLocaleDateString("es-AR")}</TableCell>
                <TableCell>
                  <StatusPill tone={STATUS_TONES[request.status]}>
                    {STATUS_LABELS[request.status]}
                  </StatusPill>
                </TableCell>
                <TableCell>
                  <div className={styles.actions}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updatingId === request.id}
                      onClick={() =>
                        handleStatusChange(request, request.status === "open" ? "resolved" : "open")
                      }
                    >
                      {request.status === "open" ? "Marcar resuelto" : "Reabrir"}
                    </Button>
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
