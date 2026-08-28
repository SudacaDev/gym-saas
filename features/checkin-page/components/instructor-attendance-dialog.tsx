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
import { StatusPill } from "@/components/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import styles from "./instructor-attendance-dialog.module.css";

/** Shape returned by GET /api/v1/staff/instructors. */
interface InstructorRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  openAttendanceId: string | null;
}

function instructorName(instructor: InstructorRow): string {
  return [instructor.firstName, instructor.lastName].filter(Boolean).join(" ") || "(sin nombre)";
}

function InstructorListSkeleton() {
  return (
    <ul className={styles.list}>
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i} className={styles.row}>
          <Skeleton className={styles.skeletonName} />
          <Skeleton className={styles.skeletonButton} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Front-desk "Fichar profesor" (T-20260827-008): a profesor's attendance is
 * normally automatic on their own login/logout (see
 * app/api/v1/staff/me/attendance/route.ts), but /checkin runs on a shared
 * mostrador device where reception is the one logged in, not the profesor —
 * so their fichaje never fires on its own there. This is the manual
 * fallback: reception opens this dialog, picks the profesor who's
 * physically at the counter, and clocks them in/out on their behalf, same
 * owner+staff endpoints (app/api/v1/staff/[id]/attendance/**) the existing
 * "Limpieza" toggle in features/staff-page uses — no new backend, just a
 * second place to trigger it from.
 */
export function InstructorAttendanceDialog({ trigger }: { trigger: ReactElement }) {
  const [open, setOpen] = useState(false);
  const [instructors, setInstructors] = useState<InstructorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadInstructors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/staff/instructors");
      if (!res.ok) {
        setError("No se pudo cargar la lista de profesores");
        return;
      }
      setInstructors(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadInstructors();
  }, [open, loadInstructors]);

  async function handleToggle(instructor: InstructorRow) {
    setError(null);
    setTogglingId(instructor.id);
    try {
      const res = instructor.openAttendanceId
        ? await fetch(
            `/api/v1/staff/${instructor.id}/attendance/${instructor.openAttendanceId}`,
            { method: "PATCH" },
          )
        : await fetch(`/api/v1/staff/${instructor.id}/attendance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffMemberId: instructor.id }),
          });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(typeof body?.error === "string" ? body.error : "No se pudo registrar el fichaje");
        return;
      }

      const attendance = await res.json();
      setInstructors((prev) =>
        prev.map((i) =>
          i.id === instructor.id
            ? { ...i, openAttendanceId: instructor.openAttendanceId ? null : attendance.id }
            : i,
        ),
      );
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fichar profesor</DialogTitle>
          <DialogDescription>
            Para cuando el profesor no loguea acá en el mostrador — elegilo y fichalo vos.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p role="alert" className={styles.errorText}>
            {error}
          </p>
        )}

        {loading ? (
          <InstructorListSkeleton />
        ) : instructors.length === 0 ? (
          <p className={styles.emptyText}>Todavía no hay profesores cargados.</p>
        ) : (
          <ul className={styles.list}>
            {instructors.map((instructor) => (
              <li key={instructor.id} className={styles.row}>
                <div className={styles.instructorInfo}>
                  <span className={styles.name}>{instructorName(instructor)}</span>
                  {instructor.openAttendanceId && (
                    <StatusPill tone="info">Fichado</StatusPill>
                  )}
                </div>
                <Button
                  variant={instructor.openAttendanceId ? "secondary" : "default"}
                  size="sm"
                  disabled={togglingId === instructor.id}
                  onClick={() => handleToggle(instructor)}
                >
                  {togglingId === instructor.id
                    ? "Fichando..."
                    : instructor.openAttendanceId
                      ? "Fichar salida"
                      : "Fichar entrada"}
                </Button>
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
