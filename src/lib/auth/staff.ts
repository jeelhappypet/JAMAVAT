import { cache } from "react";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Staff, type StaffDocument } from "@/models/Staff";
import { getRestaurantInfo } from "@/lib/restaurant";
import { canStaffSignIn, canTakeOrders, subscriptionState } from "@/lib/subscription";
import { getTranslator } from "@/lib/i18n/server";
import {
  SESSION_COOKIE_OPTIONS,
  STAFF_SESSION_COOKIE,
  createSessionToken,
  readSessionToken,
} from "@/lib/auth/session";
import type { StaffDTO, StaffRole, StaffSession } from "@/types";

/**
 * The authoritative session check: valid signature AND the staff member is
 * still active AND their sessionVersion hasn't been bumped since the cookie
 * was issued. Use this (not the proxy) before touching any data. Wrapped in
 * cache() so the shell layout and the page share one DB read per request.
 */
export const getCurrentStaff = cache(async (): Promise<StaffSession | null> => {
  const cookieStore = await cookies();
  const session = readSessionToken(cookieStore.get(STAFF_SESSION_COOKIE)?.value);
  if (!session) return null;

  await connectToDatabase();
  // A cookie from before Jamavat served many restaurants has no restaurant
  // id; its staff id alone (globally unique) finds the person, and the proxy
  // upgrades the cookie on the next page load.
  const staff = session.rid
    ? await Staff.findOne({ _id: session.sid, restaurantId: session.rid }).lean<StaffDocument>()
    : await Staff.findOne({ _id: session.sid }).setOptions({ crossTenant: true }).lean<StaffDocument>();
  if (!staff || !staff.isActive || staff.sessionVersion !== session.sv) return null;

  const restaurant = await getRestaurantInfo(staff.restaurantId);
  if (!restaurant) return null;

  return {
    id: String(staff._id),
    name: staff.name,
    role: staff.role as StaffRole,
    restaurantId: restaurant.id,
    restaurantSlug: restaurant.slug,
  };
});

/**
 * Returns the staff member, or a 401/403/402 response the route should
 * return as-is. `orders: true` additionally refuses the call when the
 * restaurant's subscription has run out — settling bills and reading data
 * stay open so nobody is locked out of money already taken.
 */
export async function requireStaff(roles: readonly StaffRole[], { orders = false } = {}): Promise<StaffSession | NextResponse> {
  const t = await getTranslator();
  let staff: StaffSession | null;
  try {
    staff = await getCurrentStaff();
  } catch {
    return NextResponse.json({ error: t("err.server") }, { status: 500 });
  }
  if (!staff) {
    return NextResponse.json({ error: t("err.loginAgain") }, { status: 401 });
  }
  if (!roles.includes(staff.role)) {
    return NextResponse.json({ error: t("err.noAccess") }, { status: 403 });
  }

  const restaurant = await getRestaurantInfo(staff.restaurantId);
  const state = restaurant ? subscriptionState(restaurant) : "cancelled";
  if (!canStaffSignIn(state)) {
    return NextResponse.json({ error: t("err.restaurantPaused") }, { status: 403 });
  }
  if (orders && !canTakeOrders(state)) {
    return NextResponse.json({ error: t("err.subscriptionEnded") }, { status: 402 });
  }
  return staff;
}

export async function startSession(staff: Pick<StaffDocument, "_id" | "role" | "sessionVersion" | "restaurantId">) {
  const restaurant = await getRestaurantInfo(staff.restaurantId);
  const cookieStore = await cookies();
  cookieStore.set(STAFF_SESSION_COOKIE, sessionTokenFor(staff, restaurant?.slug), SESSION_COOKIE_OPTIONS);
}

/** The cookie value for a staff member, used by startSession and when a pre-tenancy cookie is upgraded. */
export function sessionTokenFor(staff: Pick<StaffDocument, "_id" | "role" | "sessionVersion" | "restaurantId">, slug: string | undefined): string {
  return createSessionToken({
    sid: String(staff._id),
    sv: staff.sessionVersion,
    role: staff.role as StaffRole,
    rid: String(staff.restaurantId),
    slug,
  });
}

export async function endSession() {
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_SESSION_COOKIE);
}

export function toStaffDTO(staff: StaffDocument): StaffDTO {
  return {
    id: String(staff._id),
    name: staff.name,
    role: staff.role as StaffRole,
    isActive: staff.isActive,
    isLocked: !!staff.lockedUntil && staff.lockedUntil.getTime() > Date.now(),
    categoryIds: (staff.categoryIds ?? []).map(String),
  };
}
