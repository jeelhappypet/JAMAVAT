import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { ZodError } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Staff, type StaffDocument } from "@/models/Staff";
import { loginSchema } from "@/lib/validation/staff";
import { verifyPin } from "@/lib/auth/pin";
import { startSession, toStaffDTO } from "@/lib/auth/staff";
import { homePathFor } from "@/lib/auth/access";
import type { StaffRole } from "@/types";
import { getTranslator } from "@/lib/i18n/server";
import { zodErrorMessage } from "@/lib/i18n/zod";

const MAX_PIN_ATTEMPTS = 5;
const LOCK_MINUTES = 5;

export async function POST(request: Request) {
  const t = await getTranslator();
  try {
    const { staffId, pin } = loginSchema.parse(await request.json());
    if (!isValidObjectId(staffId)) {
      return NextResponse.json({ error: t("err.pickNameAgain") }, { status: 400 });
    }

    await connectToDatabase();
    const staff = await Staff.findOne({ _id: staffId, isActive: true }).lean<StaffDocument>();
    if (!staff) {
      return NextResponse.json({ error: t("err.pickNameAgain") }, { status: 400 });
    }

    if (staff.lockedUntil && staff.lockedUntil.getTime() > Date.now()) {
      const minutes = Math.ceil((staff.lockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { error: t("err.locked", { m: minutes }) },
        { status: 429 }
      );
    }

    if (!(await verifyPin(pin, staff.pinHash, staff.pinSalt))) {
      // $inc so two wrong guesses at the same moment both count.
      const updated = await Staff.findByIdAndUpdate(
        staff._id,
        { $inc: { failedPinAttempts: 1 } },
        { returnDocument: "after" }
      ).lean<StaffDocument>();
      const attempts = updated?.failedPinAttempts ?? MAX_PIN_ATTEMPTS;

      if (attempts >= MAX_PIN_ATTEMPTS) {
        await Staff.updateOne(
          { _id: staff._id },
          { $set: { failedPinAttempts: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000) } }
        );
        return NextResponse.json(
          { error: t("err.lockedNow", { m: LOCK_MINUTES }) },
          { status: 429 }
        );
      }
      const left = MAX_PIN_ATTEMPTS - attempts;
      return NextResponse.json(
        { error: left === 1 ? t("err.wrongPinOne") : t("err.wrongPin", { n: left }) },
        { status: 401 }
      );
    }

    if (staff.failedPinAttempts || staff.lockedUntil) {
      await Staff.updateOne({ _id: staff._id }, { $set: { failedPinAttempts: 0 }, $unset: { lockedUntil: 1 } });
    }

    await startSession(staff);
    return NextResponse.json({
      staff: toStaffDTO(staff),
      redirectTo: homePathFor(staff.role as StaffRole),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: zodErrorMessage(error, t) }, { status: 400 });
    }
    return NextResponse.json({ error: t("err.loginFailed") }, { status: 500 });
  }
}
