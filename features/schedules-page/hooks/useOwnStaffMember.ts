"use client";
import { useCallback, useEffect, useState } from "react";
import type { OwnStaffMemberRow } from "@/lib/staff/resolve-own-staff-member";

/**
 * Same GET /api/v1/staff/me the profile page (features/profile-page) uses,
 * but tolerant of the owner case: a 404 there just means "no staff
 * profile" — the expected, non-error outcome for an owner viewing
 * /schedules — not something to surface as an error. Powers the "Mis
 * clases" filter and the instructor picker's self-assign behavior
 * (T-20260827-007): both need to know "is the viewer themselves a
 * profesor," not edit their profile.
 */
export function useOwnStaffMember() {
  const [ownStaffMember, setOwnStaffMember] = useState<OwnStaffMemberRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/staff/me");
      setOwnStaffMember(res.ok ? await res.json() : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { ownStaffMember, loading };
}
