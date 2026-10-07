import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { ZodError } from "zod";
import { Staff, type StaffDocument } from "@/models/Staff";
import { updateStaffSchema } from "@/lib/validation/staff";
import { hashPin } from "@/lib/auth/pin";
import { requireStaff, startSession, toStaffDTO } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getTranslator } from "@/lib/i18n/server";
import { zodErrorMessage } from "@/lib/i18n/zod";

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const current = await requireStaff(ROLES.admin);
  if (current instanceof NextResponse) return current;
  const t = await getTranslator();

  try {
    const { id } = await params;
    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: t("err.staffNotFound") }, { status: 404 });
    }
    const { name, role, isActive, pin, logoutEverywhere } = updateStaffSchema.parse(await request.json());

    const target = await Staff.findById(id).lean<StaffDocument>();
    if (!target) {
      return NextResponse.json({ error: t("err.staffNotFound") }, { status: 404 });
    }

    const losesAdmin =
      target.role === "ADMIN" &&
      target.isActive &&
      ((role !== undefined && role !== "ADMIN") || isActive === false);
    if (losesAdmin && (await Staff.countDocuments({ role: "ADMIN", isActive: true })) <= 1) {
      return NextResponse.json({ error: t("err.keepOneAdmin") }, { status: 409 });
    }

    const set: Record<string, unknown> = {};
    if (name !== undefined) set.name = name;
    if (role !== undefined) set.role = role;
    if (isActive !== undefined) set.isActive = isActive;
    if (pin !== undefined) Object.assign(set, await hashPin(pin), { failedPinAttempts: 0 });

    // Anything that changes what this person may do (or who they prove they
    // are) signs out every device they're logged in on.
    const signOut =
      (role !== undefined && role !== target.role) ||
      isActive === false ||
      pin !== undefined ||
      logoutEverywhere === true;

    const updated = await Staff.findByIdAndUpdate(
      id,
      {
        ...(Object.keys(set).length > 0 ? { $set: set } : {}),
        ...(signOut ? { $inc: { sessionVersion: 1 } } : {}),
        ...(pin !== undefined ? { $unset: { lockedUntil: 1 } } : {}),
      },
      { returnDocument: "after" }
    ).lean<StaffDocument>();
    if (!updated) {
      return NextResponse.json({ error: t("err.staffNotFound") }, { status: 404 });
    }

    // An admin editing their own account keeps this device logged in.
    if (signOut && updated.isActive && String(updated._id) === current.id) {
      await startSession(updated);
    }

    return NextResponse.json({ staff: toStaffDTO(updated) });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: zodErrorMessage(error, t) }, { status: 400 });
    }
    if (isDuplicateKeyError(error)) {
      return NextResponse.json({ error: t("err.duplicateName") }, { status: 409 });
    }
    return NextResponse.json({ error: t("err.staffUpdate") }, { status: 500 });
  }
}
