import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH, appPath, canAccessPage, homePathFor } from "@/lib/auth/access";
import type { StaffSession } from "@/types";

/**
 * The guard every staff page starts with. The proxy already checked the
 * cookie's signature; this one is the authoritative check (the staff member
 * still exists, is active and their session wasn't revoked), and it also
 * refuses a session belonging to a different restaurant than the link —
 * a staff member who opens someone else's link lands back in their own app.
 */
export async function requirePageStaff(slug: string, path: string): Promise<StaffSession> {
  const staff = await getCurrentStaff();
  if (!staff) redirect(EXPIRED_SESSION_PATH);
  if (staff.restaurantSlug !== slug) redirect(appPath(staff.restaurantSlug, homePathFor(staff.role)));
  if (!canAccessPage(staff.role, path)) redirect(appPath(slug, homePathFor(staff.role)));
  return staff;
}
