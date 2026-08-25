"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Member } from "@/db/schema/members";
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

export function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/members");
      if (res.ok) {
        setMembers(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  function handleSaved(saved: Member) {
    setError(null);
    setMembers((prev) => {
      const exists = prev.some((m) => m.id === saved.id);
      return exists
        ? prev.map((m) => (m.id === saved.id ? saved : m))
        : [...prev, saved];
    });
  }

  async function handleDelete(member: Member) {
    setError(null);
    if (!confirm(`¿Dar de baja a ${member.firstName} ${member.lastName}?`))
      return;

    const res = await fetch(`/api/v1/members/${member.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        typeof body?.error === "string" ? body.error : "No se pudo dar de baja al socio",
      );
      return;
    }
    // Soft delete — the row still exists server-side, just filtered out of
    // the "active members" list this page shows.
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
  }

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
