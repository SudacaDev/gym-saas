"use client";

import Link from "next/link";
import { UsersIcon } from "lucide-react";
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
import { MemberFormDialog } from "./components/member-form-dialog";
import { MembersTableSkeleton } from "./components/members-table-skeleton";
import styles from "./index.module.css";
import { useMembers } from "./hooks/useMembers";
import { membershipDisplay } from "./types";

export function MembersPage() {
  const {
    members,
    filteredMembers,
    loading,
    error,
    search,
    setSearch,
    pendingDelete,
    handleSaved,
    requestDelete,
    confirmDelete,
    cancelDelete,
  } = useMembers();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Socios</h1>
        <MemberFormDialog
          trigger={<Button>Nuevo socio</Button>}
          onSaved={handleSaved}
        />
      </div>

      <Input
        placeholder="Buscar por nombre, email, teléfono o código..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={styles.search}
      />

      {error && <p className={styles.errorText}>{error}</p>}

      {loading ? (
        <MembersTableSkeleton />
      ) : filteredMembers.length === 0 ? (
        members.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="Todavía no hay socios"
            description="Los socios que des de alta van a aparecer acá, con su estado de membresía a la vista."
            action={
              <MemberFormDialog
                trigger={<Button>Dar de alta tu primer socio</Button>}
                onSaved={handleSaved}
              />
            }
          />
        ) : (
          <p className={styles.emptyText}>No hay resultados.</p>
        )
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className={styles.actionsHead}>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMembers.map((member) => {
              const status = membershipDisplay(member);
              return (
              <TableRow key={member.id}>
                <TableCell>
                  {member.firstName} {member.lastName}
                </TableCell>
                <TableCell>
                  <StatusPill tone={status.tone}>{status.label}</StatusPill>
                </TableCell>
                <TableCell className={styles.shortCodeCell}>{member.shortCode}</TableCell>
                <TableCell>{member.email ?? "—"}</TableCell>
                <TableCell>{member.phone ?? "—"}</TableCell>
                <TableCell>
                  <div className={styles.actions}>
                    <Button
                      variant="outline"
                      size="sm"
                      nativeButton={false}
                      render={<Link href={`/members/${member.id}`} />}
                    >
                      Ver
                    </Button>
                    <MemberFormDialog
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
              );
            })}
          </TableBody>
        </Table>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && cancelDelete()}
        title="Dar de baja al socio"
        description={
          pendingDelete
            ? `¿Dar de baja a ${pendingDelete.firstName} ${pendingDelete.lastName}? Vas a poder darlo de alta de nuevo más adelante si hace falta.`
            : ""
        }
        confirmLabel="Dar de baja"
        confirmingLabel="Dando de baja..."
        onConfirm={confirmDelete}
      />
    </div>
  );
}
