import { cache } from "react";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Staff, type StaffDocument } from "@/models/Staff";
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
  const staff = await Staff.findById(session.sid).lean<StaffDocument>();
  if (!staff || !staff.isActive || staff.sessionVersion !== session.sv) return null;

  return { id: String(staff._id), name: staff.name, role: staff.role as StaffRole };
});

/** Returns the staff member, or a 401/403 response the route should return as-is. */
export async function requireStaff(roles: readonly StaffRole[]): Promise<StaffSession | NextResponse> {
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
  return staff;
}

export async function startSession(staff: Pick<StaffDocument, "_id" | "role" | "sessionVersion">) {
  const cookieStore = await cookies();
  const token = createSessionToken({
    sid: String(staff._id),
    sv: staff.sessionVersion,
    role: staff.role as StaffRole,
  });
  cookieStore.set(STAFF_SESSION_COOKIE, token, SESSION_COOKIE_OPTIONS);
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
