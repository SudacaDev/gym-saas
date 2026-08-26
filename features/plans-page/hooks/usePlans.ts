"use client";
import { useCallback, useEffect, useState } from "react";
import type { Plan } from "@/db/schema/plans";



export const usePlans = () => {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);


    const loadPlans = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/v1/plans");
            if (res.ok) {
                setPlans(await res.json());
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPlans();
    }, [loadPlans]);

    function handleSaved(saved: Plan) {
        setError(null);
        setPlans((prev) => {
            const exists = prev.some((p) => p.id === saved.id);
            return exists
                ? prev.map((p) => (p.id === saved.id ? saved : p))
                : [...prev, saved];
        });
    }

    async function handleDelete(plan: Plan) {
        setError(null);
        if (!confirm(`¿Borrar el plan "${plan.name}"?`)) return;

        const res = await fetch(`/api/v1/plans/${plan.id}`, { method: "DELETE" });
        if (!res.ok) {
            const body = await res.json().catch(() => null);
            setError(
                typeof body?.error === "string" ? body.error : "No se pudo borrar el plan",
            );
            return;
        }
        setPlans((prev) => prev.filter((p) => p.id !== plan.id));
    }

    return {
        plans,
        loading,
        error,
        loadPlans,
        handleSaved,
        handleDelete,
    }
}