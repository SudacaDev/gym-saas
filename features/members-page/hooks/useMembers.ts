"use client";
import { useCallback, useEffect, useState } from "react";
import type { Member } from "@/db/schema/members";



export const useMembers = () => {
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

    return {
        members,
        loading,
        error,
        loadMembers,
        handleSaved,
        handleDelete,
    }
}
