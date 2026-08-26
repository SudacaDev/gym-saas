"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MemberFormDialog } from "./components/member-form-dialog";
import styles from "./index.module.css";
import { useMembers } from "./hooks/useMembers";

export function MembersPage() {
  const { members, loading, error, handleSaved, handleDelete } = useMembers();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Socios</h1>
        <MemberFormDialog
          trigger={<Button>Nuevo socio</Button>}
          onSaved={handleSaved}
        />
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      {loading ? (
        <p className={styles.emptyText}>Cargando...</p>
      ) : members.length === 0 ? (
        <p className={styles.emptyText}>
          Todavía no hay socios.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className={styles.actionsHead}>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  {member.firstName} {member.lastName}
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
