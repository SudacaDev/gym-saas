"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { StaffMemberRow } from "../types";

export const useStaff = () => {
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

    return {
        staff,
        loading,
        error,
        search,
        setSearch,
        attendanceError,
        togglingId,
        filteredStaff,
        loadStaff,
        handleSaved,
        handleDelete,
        handleToggleAttendance,
    }
}
