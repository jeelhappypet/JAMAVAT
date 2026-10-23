import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { ZodError } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Staff, type StaffDocument } from "@/models/Staff";
import { loginSchema } from "@/lib/validation/staff";
import { verifyPin } from "@/lib/auth/pin";
import { startSession, toStaffDTO } from "@/lib/auth/staff";
import { appPath, homePathFor } from "@/lib/auth/access";
import { getRestaurantBySlug } from "@/lib/restaurant";
import type { StaffRole } from "@/types";
import { getTranslator } from "@/lib/i18n/server";
import { zodErrorMessage } from "@/lib/i18n/zod";

const MAX_PIN_ATTEMPTS = 5;
const LOCK_MINUTES = 5;

export async function POST(request: Request) {
  const t = await getTranslator();
  try {
    const { slug, staffId, pin } = loginSchema.parse(await request.json());
    if (!isValidObjectId(staffId)) {
      return NextResponse.json({ error: t("err.pickNameAgain") }, { status: 400 });
    }

    await connectToDatabase();
    // The restaurant comes from its own login screen, and every lookup below is
    // scoped to it — a staff id from another restaurant simply isn't found.
    const found = await getRestaurantBySlug(slug);
    if (!found) {
      return NextResponse.json({ error: t("err.pickNameAgain") }, { status: 400 });
    }
    const restaurantId = found.restaurant.id;

    // Only what the PIN check and the session cookie need.
    const staff = await Staff.findOne({ restaurantId, _id: staffId, isActive: true })
      .select({ name: 1, role: 1, restaurantId: 1, sessionVersion: 1, isActive: 1, pinHash: 1, pinSalt: 1, failedPinAttempts: 1, lockedUntil: 1 })
      .lean<StaffDocument>();
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
      const updated = await Staff.findOneAndUpdate(
        { restaurantId, _id: staff._id },
        { $inc: { failedPinAttempts: 1 } },
        { returnDocument: "after" }
      ).lean<StaffDocument>();
      const attempts = updated?.failedPinAttempts ?? MAX_PIN_ATTEMPTS;

      if (attempts >= MAX_PIN_ATTEMPTS) {
        await Staff.updateOne(
          { restaurantId, _id: staff._id },
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
      await Staff.updateOne({ restaurantId, _id: staff._id }, { $set: { failedPinAttempts: 0 }, $unset: { lockedUntil: 1 } });
    }

    await startSession(staff);
    return NextResponse.json({
      staff: toStaffDTO(staff),
      redirectTo: appPath(found.restaurant.slug, homePathFor(staff.role as StaffRole)),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: zodErrorMessage(error, t) }, { status: 400 });
    }
    // Without this a failed login is a blank 500 on the screen and nothing in the
    // logs — which is exactly how a scoping bug here stayed invisible.
    console.error("[login] failed", error);
    return NextResponse.json({ error: t("err.loginFailed") }, { status: 500 });
  }
}
