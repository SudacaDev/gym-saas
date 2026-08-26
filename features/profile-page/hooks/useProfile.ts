"use client";
import { useCallback, useEffect, useState } from "react";
import type { StaffProfile } from "../types";

export function useProfile() {
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/staff/me");
      if (!res.ok) {
        setError("No se pudo cargar tu perfil");
        return;
      }
      setProfile(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  return { profile, loading, error, setProfile };
}
