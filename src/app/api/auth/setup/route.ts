import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Staff } from "@/models/Staff";
import { setupSchema } from "@/lib/validation/staff";
import { verifySetupKey } from "@/lib/auth/session";
import { hashPin } from "@/lib/auth/pin";
import { startSession } from "@/lib/auth/staff";
import { saveRestaurantName } from "@/lib/restaurant";
import { getTranslator } from "@/lib/i18n/server";
import { zodErrorMessage } from "@/lib/i18n/zod";

/** First run only: creates the first admin. Refuses once any staff exists. */
export async function POST(request: Request) {
  const t = await getTranslator();
  try {
    const { setupKey, restaurantName, name, pin } = setupSchema.parse(await request.json());
    if (!verifySetupKey(setupKey)) {
      return NextResponse.json({ error: t("err.wrongSetupKey") }, { status: 401 });
    }

    await connectToDatabase();
    if ((await Staff.countDocuments()) > 0) {
      return NextResponse.json({ error: t("err.setupDone") }, { status: 409 });
    }

    await saveRestaurantName(restaurantName);
    const admin = await Staff.create({ name, role: "ADMIN", ...(await hashPin(pin)) });
    await startSession(admin);
    return NextResponse.json({ ok: true, redirectTo: "/" }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: zodErrorMessage(error, t) }, { status: 400 });
    }
    return NextResponse.json({ error: t("err.setupFailed") }, { status: 500 });
  }
}
