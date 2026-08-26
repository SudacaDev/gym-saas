import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/auth/get-tenant-context";
import { resolveOwnStaffMember } from "@/lib/staff/resolve-own-staff-member";
import { ProfilePage } from "@/features/profile-page";

// Server-side guard (T-20260826-009), same pattern as
// app/(owner)/layout.tsx's role check: "Mi perfil" is staff-only (owner
// has no staffMembers row to show here) and, within staff, "cleaning" is
// explicitly excluded (product decision — they don't self-service
// anything, see T-20260826-007). Both cases redirect to /dashboard rather
// than rendering an empty/broken page.
export default async function ProfileRoute() {
  const context = await getTenantContext();
  if (context.role !== "staff") {
    redirect("/dashboard");
  }

  const ownStaffMember = await resolveOwnStaffMember(context);
  if (!ownStaffMember || ownStaffMember.staffCategory === "cleaning") {
    redirect("/dashboard");
  }

  return <ProfilePage />;
}
