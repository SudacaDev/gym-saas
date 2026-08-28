"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Lead } from "@/db/schema/leads";

// "Nuevo" leads are the actionable ones (nobody followed up yet) — those
// come first, most recent first within the group, same "surface what needs
// attention" logic operational-requests-page uses for open-first sorting.
const STATUS_RANK: Record<Lead["status"], number> = {
  nuevo: 0,
  convertido: 1,
  perdido: 2,
};

function compareLeadsByUrgency(a: Lead, b: Lead): number {
  const rankDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
  if (rankDiff !== 0) return rankDiff;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<Lead["status"] | null>(null);
  const [search, setSearch] = useState("");

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

  const sortedLeads = useMemo(
    () => [...leads].sort(compareLeadsByUrgency),
    [leads],
  );

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sortedLeads;
    return sortedLeads.filter((lead) =>
      `${lead.name} ${lead.whatsapp} ${lead.note ?? ""}`.toLowerCase().includes(query),
    );
  }, [sortedLeads, search]);

  function handleCreated(lead: Lead) {
    setError(null);
    setLeads((prev) => [lead, ...prev]);
  }

  async function handleStatusChange(lead: Lead, status: Lead["status"]) {
    setError(null);
    setUpdatingId(lead.id);
    setPendingStatus(status);
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
      setPendingStatus(null);
    }
  }

  return {
    leads: sortedLeads,
    filteredLeads,
    loading,
    error,
    search,
    setSearch,
    updatingId,
    pendingStatus,
    handleCreated,
    handleStatusChange,
  };
}
