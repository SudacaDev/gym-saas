"use client";
import { useCallback, useEffect, useState } from "react";
import type { OperationalRequest } from "@/db/schema/operational-requests";

// GET/POST both return this shape (app/api/v1/operational-requests/route.ts
// merges the reporter's name into the POST response too, so the UI never
// needs a second round trip just to show "quién la reportó").
export interface OperationalRequestRow extends OperationalRequest {
  reportedByFirstName: string | null;
  reportedByLastName: string | null;
}

export function useOperationalRequests() {
  const [requests, setRequests] = useState<OperationalRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/operational-requests");
      if (res.ok) setRequests(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  function handleCreated(request: OperationalRequestRow) {
    setError(null);
    setRequests((prev) => [request, ...prev]);
  }

  async function handleStatusChange(
    request: OperationalRequestRow,
    status: OperationalRequest["status"],
  ) {
    setError(null);
    setUpdatingId(request.id);
    try {
      const res = await fetch(`/api/v1/operational-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(typeof body?.error === "string" ? body.error : "No se pudo actualizar la necesidad");
        return;
      }
      const updated = (await res.json()) as OperationalRequest;
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r)),
      );
    } finally {
      setUpdatingId(null);
    }
  }

  return {
    requests,
    loading,
    error,
    updatingId,
    handleCreated,
    handleStatusChange,
  };
}
