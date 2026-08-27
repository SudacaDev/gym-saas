"use client";
import { useCallback, useEffect, useState } from "react";
import type { Lead } from "@/db/schema/leads";

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/leads");
      if (res.ok) setLeads(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  function handleCreated(lead: Lead) {
    setError(null);
    setLeads((prev) => [lead, ...prev]);
  }

  async function handleStatusChange(lead: Lead, status: Lead["status"]) {
    setError(null);
    setUpdatingId(lead.id);
    try {
      const res = await fetch(`/api/v1/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(typeof body?.error === "string" ? body.error : "No se pudo actualizar el prospecto");
        return;
      }
      const updated = (await res.json()) as Lead;
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    } finally {
      setUpdatingId(null);
    }
  }

  return {
    leads,
    loading,
    error,
    updatingId,
    handleCreated,
    handleStatusChange,
  };
}
