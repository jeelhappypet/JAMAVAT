import { NextResponse, type NextRequest } from "next/server";
import { Staff, type StaffDocument } from "@/models/Staff";
import { getCurrentStaff, sessionTokenFor } from "@/lib/auth/staff";
import { EXPIRED_SESSION_PATH, appPath, homePathFor } from "@/lib/auth/access";
import { SESSION_COOKIE_OPTIONS, STAFF_SESSION_COOKIE } from "@/lib/auth/session";

/**
 * "Take me to my restaurant's app." A staff device whose cookie predates
 * per-restaurant links — an app installed when `start_url` was still `/`, an
 * old bookmark — has no slug in it, so the proxy can't route it without a
 * database read. It sends such a device here instead: this reads the staff
 * member, redirects to their own app and re-issues the cookie with the
 * restaurant in it, so the trip happens only once.
 */
export async function GET(request: NextRequest) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.redirect(new URL(EXPIRED_SESSION_PATH, request.url));

  const next = request.nextUrl.searchParams.get("next");
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : homePathFor(staff.role);
  const response = NextResponse.redirect(new URL(appPath(staff.restaurantSlug, target), request.url));

  const doc = await Staff.findOne({ restaurantId: staff.restaurantId, _id: staff.id })
    .select({ role: 1, sessionVersion: 1, restaurantId: 1 })
    .lean<StaffDocument>();
  if (doc) response.cookies.set(STAFF_SESSION_COOKIE, sessionTokenFor(doc, staff.restaurantSlug), SESSION_COOKIE_OPTIONS);
  return response;
}
