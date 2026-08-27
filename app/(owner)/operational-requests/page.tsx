import { OperationalRequestsPage } from "@/features/operational-requests-page";

// Owner+staff both land here — reporting/resolving a floor-level need is a
// front-desk operation (T-20260826-010), enforced server-side by
// app/api/v1/operational-requests/**'s requireRole(["owner", "staff"]).
export default function OperationalRequestsRoute() {
  return <OperationalRequestsPage />;
}
