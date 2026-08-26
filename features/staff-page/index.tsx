"use client";

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
import { CATEGORY_LABELS } from "./types";
import styles from "./index.module.css";
import { useStaff } from "./hooks/useStaff";

export function StaffPage() {
  const {
    staff,
    loading,
    error,
    search,
    setSearch,
    attendanceError,
    togglingId,
    filteredStaff,
    handleSaved,
    handleDelete,
    handleToggleAttendance,
  } = useStaff();

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
                    {/* T-20260826-007: everyone else fichas automatically on
                        login/logout now — this manual toggle is only for
                        "cleaning", who never log in to self-service it. */}
                    {member.staffCategory === "cleaning" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={togglingId === member.id}
                        onClick={() => handleToggleAttendance(member)}
                      >
                        {member.openAttendanceId ? "Fichar salida" : "Fichar entrada"}
                      </Button>
                    )}
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
