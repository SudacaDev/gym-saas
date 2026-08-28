"use client";

import { useCallback, useEffect, useState, type ReactElement } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { StaffAttendanceRow, StaffMemberRow } from "../types";
import styles from "./staff-attendance-dialog.module.css";

interface StaffAttendanceDialogProps {
  /** Element that opens the dialog when clicked (e.g. a <Button>). */
  trigger: ReactElement;
  member: StaffMemberRow;
}

// `StaffAttendanceRow`'s clockIn/clockOut are typed as `Date` (from
// StaffAttendance's Drizzle $inferSelect), but this component fetches raw
// JSON — over the wire they arrive as ISO strings, not real Date
// instances. `new Date(...)` handles both.
function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("es-AR");
}

function formatTime(value: Date | string): string {
  return new Date(value).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

/** Mirrors the real `.row` list item shape (date + times) while `loading`. */
function AttendanceHistorySkeleton() {
  return (
    <ul className={styles.list}>
      {Array.from({ length: 3 }, (_, rowIndex) => (
        <li key={rowIndex} className={styles.row}>
          <Skeleton className={styles.skeletonDate} />
          <Skeleton className={styles.skeletonTimes} />
        </li>
      ))}
    </ul>
  );
}

/**
 * "Listado básico" of a staff member's clock-in/out history (T-20260825-005).
 * Deliberately a per-row dialog rather than a new staff detail page/route —
 * unlike members, staff has no `features/staff-detail-page/` today, and
 * building one is a much bigger scope than "básico" for this pass. See the
 * gate for the full scope-decision writeup.
 */
export function StaffAttendanceDialog({ trigger, member }: StaffAttendanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<StaffAttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/staff/${member.id}/attendance`);
      if (!res.ok) {
        setError("No se pudo cargar el historial de fichajes");
        return;
      }
      setRows(await res.json());
    } finally {
      setLoading(false);
    }
  }, [member.id]);

  useEffect(() => {
    if (open) loadHistory();
  }, [open, loadHistory]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Fichajes de {member.firstName} {member.lastName}
          </DialogTitle>
          <DialogDescription>Historial de entradas y salidas, más recientes primero.</DialogDescription>
        </DialogHeader>

        {error && <p className={styles.errorText}>{error}</p>}

        {loading ? (
          <AttendanceHistorySkeleton />
        ) : rows.length === 0 ? (
          <p className={styles.emptyText}>Todavía no hay fichajes registrados.</p>
        ) : (
          <ul className={styles.list}>
            {rows.map((row) => (
              <li key={row.id} className={styles.row}>
                <span className={styles.date}>{formatDate(row.clockIn)}</span>
                <span className={styles.times}>
                  {formatTime(row.clockIn)} — {row.clockOut ? formatTime(row.clockOut) : "En curso"}
                </span>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
