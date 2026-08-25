"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/status-pill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StaffFormDialog } from "./components/staff-form-dialog";
import { StaffAttendanceDialog } from "./components/staff-attendance-dialog";
import { CATEGORY_LABELS, type StaffMemberRow } from "./types";
import styles from "./index.module.css";

export function StaffPage() {
  const [staff, setStaff] = useState<StaffMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/staff");
      if (res.ok) {
        setStaff(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  function handleSaved(saved: StaffMemberRow) {
    setError(null);
    setStaff((prev) => {
      const exists = prev.some((s) => s.id === saved.id);
      // PATCH/POST /api/v1/staff's response doesn't select openAttendanceId
      // (that field only comes from GET's correlated subquery, see
      // app/api/v1/staff/route.ts) — preserve whatever this row already
      // had locally instead of letting it get clobbered to undefined by a
      // plain edit, which would silently reset an open "Fichar salida"
      // state back to "Fichar entrada" in the UI.
      return exists
        ? prev.map((s) =>
            s.id === saved.id ? { ...saved, openAttendanceId: s.openAttendanceId } : s,
          )
        : [...prev, saved];
    });
  }

  async function handleDelete(member: StaffMemberRow) {
    setError(null);
    if (!confirm(`¿Dar de baja a ${member.firstName} ${member.lastName}?`)) return;

    const res = await fetch(`/api/v1/staff/${member.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        typeof body?.error === "string" ? body.error : "No se pudo dar de baja a la persona",
      );
      return;
    }
    setStaff((prev) => prev.filter((s) => s.id !== member.id));
  }

  // Clocks a staff member in/out (T-20260825-005). Toggles based on
  // `openAttendanceId` (a correlated subquery on GET /api/v1/staff — see
  // app/api/v1/staff/route.ts) rather than a separate per-row fetch:
  // present -> PATCH that row's clockOut; absent -> POST a new open row.
  async function handleToggleAttendance(member: StaffMemberRow) {
    setAttendanceError(null);
    setTogglingId(member.id);
    try {
      const isOpen = Boolean(member.openAttendanceId);
      const res = isOpen
        ? await fetch(`/api/v1/staff/${member.id}/attendance/${member.openAttendanceId}`, {
            method: "PATCH",
          })
        : await fetch(`/api/v1/staff/${member.id}/attendance`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffMemberId: member.id }),
          });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setAttendanceError(
          typeof body?.error === "string" ? body.error : "No se pudo registrar el fichaje",
        );
        return;
      }

      const attendance = await res.json();
      setStaff((prev) =>
        prev.map((s) =>
          s.id === member.id
            ? { ...s, openAttendanceId: isOpen ? null : attendance.id }
            : s,
        ),
      );
    } finally {
      setTogglingId(null);
    }
  }

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return staff;
    return staff.filter((member) =>
      `${member.firstName} ${member.lastName} ${member.email ?? ""}`
        .toLowerCase()
        .includes(query),
    );
  }, [staff, search]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Equipo</h1>
        <StaffFormDialog trigger={<Button>Invitar</Button>} onSaved={handleSaved} />
      </div>

      <Input
        placeholder="Buscar por nombre o email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={styles.search}
      />

      {error && <p className={styles.errorText}>{error}</p>}
      {attendanceError && <p className={styles.errorText}>{attendanceError}</p>}

      {loading ? (
        <p className={styles.emptyText}>Cargando...</p>
      ) : filteredStaff.length === 0 ? (
        <p className={styles.emptyText}>
          {staff.length === 0 ? "Todavía no invitaste a nadie." : "No hay resultados."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Alta</TableHead>
              <TableHead className={styles.actionsHead}>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaff.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  {member.firstName} {member.lastName}
                </TableCell>
                <TableCell>{member.email ?? "—"}</TableCell>
                <TableCell>{CATEGORY_LABELS[member.staffCategory]}</TableCell>
                <TableCell>
                  <StatusPill tone="success">Activo</StatusPill>
                </TableCell>
                <TableCell>
                  {new Date(member.createdAt).toLocaleDateString("es-AR")}
                </TableCell>
                <TableCell>
                  <div className={styles.actions}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={togglingId === member.id}
                      onClick={() => handleToggleAttendance(member)}
                    >
                      {member.openAttendanceId ? "Fichar salida" : "Fichar entrada"}
                    </Button>
                    <StaffAttendanceDialog
                      member={member}
                      trigger={
                        <Button variant="outline" size="sm">
                          Historial
                        </Button>
                      }
                    />
                    <StaffFormDialog
                      member={member}
                      trigger={
                        <Button variant="outline" size="sm">
                          Editar
                        </Button>
                      }
                      onSaved={handleSaved}
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(member)}
                    >
                      Dar de baja
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
