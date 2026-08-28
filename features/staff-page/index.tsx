"use client";

import { IdCardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
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
import { StaffTableSkeleton } from "./components/staff-table-skeleton";
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
    pendingDelete,
    filteredStaff,
    handleSaved,
    requestDelete,
    confirmDelete,
    cancelDelete,
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
        <StaffTableSkeleton />
      ) : filteredStaff.length === 0 ? (
        staff.length === 0 ? (
          <EmptyState
            icon={IdCardIcon}
            title="Todavía no invitaste a nadie"
            description="Las personas que invites a tu equipo van a aparecer acá, con su categoría y estado."
            action={<StaffFormDialog trigger={<Button>Invitar a la primera persona</Button>} onSaved={handleSaved} />}
          />
        ) : (
          // Zero search matches, not zero data — stays a plain line so it
          // reads as "narrow your search," not "nothing here yet."
          <p className={styles.emptyText}>No hay resultados.</p>
        )
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
                        {togglingId === member.id
                          ? "Fichando..."
                          : member.openAttendanceId
                            ? "Fichar salida"
                            : "Fichar entrada"}
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
                      onClick={() => requestDelete(member)}
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

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && cancelDelete()}
        title="Dar de baja a la persona"
        description={
          pendingDelete
            ? `¿Dar de baja a ${pendingDelete.firstName} ${pendingDelete.lastName}? Vas a poder darla de alta de nuevo más adelante si hace falta.`
            : ""
        }
        confirmLabel="Dar de baja"
        confirmingLabel="Dando de baja..."
        onConfirm={confirmDelete}
      />
    </div>
  );
}
