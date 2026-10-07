import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Staff, type StaffDocument } from "@/models/Staff";
import { changePinSchema } from "@/lib/validation/staff";
import { hashPin, verifyPin } from "@/lib/auth/pin";
import { requireStaff, startSession } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getTranslator } from "@/lib/i18n/server";
import { zodErrorMessage } from "@/lib/i18n/zod";

/**
 * Any staff member can change their own PIN. Other devices logged in as
 * this person are signed out (sessionVersion bump); this device stays in.
 */
export async function POST(request: Request) {
  const current = await requireStaff(ROLES.anyStaff);
  if (current instanceof NextResponse) return current;
  const t = await getTranslator();

  try {
    const { currentPin, newPin } = changePinSchema.parse(await request.json());

    const staff = await Staff.findById(current.id).lean<StaffDocument>();
    if (!staff || !(await verifyPin(currentPin, staff.pinHash, staff.pinSalt))) {
      return NextResponse.json({ error: t("err.currentPinWrong") }, { status: 400 });
    }

    const updated = await Staff.findByIdAndUpdate(
      staff._id,
      { $set: await hashPin(newPin), $inc: { sessionVersion: 1 } },
      { returnDocument: "after" }
    ).lean<StaffDocument>();
    if (!updated) {
      return NextResponse.json({ error: t("err.loginAgain") }, { status: 401 });
    }

    await startSession(updated);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: zodErrorMessage(error, t) }, { status: 400 });
    }
    return NextResponse.json({ error: t("err.changePinFailed") }, { status: 500 });
  }
}
