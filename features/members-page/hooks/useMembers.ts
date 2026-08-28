"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Member } from "@/db/schema/members";
import { compareMembersByUrgency, type MemberWithStatus } from "../types";



export const useMembers = () => {
    const [members, setMembers] = useState<MemberWithStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<MemberWithStatus | null>(null);
    const [search, setSearch] = useState("");


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

    const sortedMembers = useMemo(
        () => [...members].sort(compareMembersByUrgency),
        [members],
    );

    const filteredMembers = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return sortedMembers;
        return sortedMembers.filter((member) =>
            `${member.firstName} ${member.lastName} ${member.email ?? ""} ${member.phone ?? ""} ${member.shortCode}`
                .toLowerCase()
                .includes(query),
        );
    }, [sortedMembers, search]);

    function handleSaved(saved: Member) {
        setError(null);
        setMembers((prev) => {
            const existing = prev.find((m) => m.id === saved.id);
            // POST/PATCH /api/v1/members returns a bare Member, not the
            // GET list's joined membership status — editing a member's own
            // info never touches their membership, so carry over whatever
            // this row already had locally instead of dropping it to
            // "none"/null (same reason useStaff.ts preserves
            // openAttendanceId on handleSaved).
            const withStatus: MemberWithStatus = existing
                ? { ...saved, membershipStatus: existing.membershipStatus, membershipEndDate: existing.membershipEndDate }
                : { ...saved, membershipStatus: "none", membershipEndDate: null };
            return existing
                ? prev.map((m) => (m.id === saved.id ? withStatus : m))
                : [...prev, withStatus];
        });
    }

    function requestDelete(member: MemberWithStatus) {
        setError(null);
        setPendingDelete(member);
    }

    async function confirmDelete() {
        if (!pendingDelete) return;
        const res = await fetch(`/api/v1/members/${pendingDelete.id}`, {
            method: "DELETE",
        });
        if (!res.ok) {
            const body = await res.json().catch(() => null);
            setError(
                typeof body?.error === "string" ? body.error : "No se pudo dar de baja al socio",
            );
            setPendingDelete(null);
            return;
        }
        // Soft delete — the row still exists server-side, just filtered out of
        // the "active members" list this page shows.
        setMembers((prev) => prev.filter((m) => m.id !== pendingDelete.id));
        setPendingDelete(null);
    }

    return {
        members: sortedMembers,
        filteredMembers,
        loading,
        error,
        search,
        setSearch,
        pendingDelete,
        loadMembers,
        handleSaved,
        requestDelete,
        confirmDelete,
        cancelDelete: () => setPendingDelete(null),
    }
}
