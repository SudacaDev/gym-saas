import { LeadsPage } from "@/features/leads-page";

// Owner+staff both land here — capturing/following up on a walk-in
// prospect is a front-desk operation (T-20260826-013), enforced
// server-side by app/api/v1/leads/**'s requireRole(["owner", "staff"]).
export default function LeadsRoute() {
  return <LeadsPage />;
}
