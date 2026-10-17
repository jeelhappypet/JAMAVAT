import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Staff } from "@/models/Staff";
import { inviteAcceptSchema } from "@/lib/validation/staff";
import { checkInvite, clearInvite } from "@/lib/auth/invite";
import { hashPin } from "@/lib/auth/pin";
import { startSession } from "@/lib/auth/staff";
import { appPath, homePathFor } from "@/lib/auth/access";
import { getRestaurantBySlug } from "@/lib/restaurant";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

/**
 * The owner opens the invite link HQ emailed them and creates the first
 * admin login for their restaurant. Refused once that restaurant has any
 * staff, so the link can't add a second admin later.
 */
export async function POST(request: Request) {
  const t = await getTranslator();
  return respond(t, "err.setupFailed", async () => {
    const { slug, invite, name, pin } = inviteAcceptSchema.parse(await request.json());
    const found = await getRestaurantBySlug(slug);
    if (!found) return jsonError(t("err.inviteInvalid"), 404);

    const checked = await checkInvite(found.restaurant.id, invite);
    if (!checked.ok) {
      return checked.reason === "USED" ? jsonError(t("err.inviteUsed"), 409) : jsonError(t("err.inviteInvalid"), 401);
    }

    await connectToDatabase();
    const admin = await Staff.create({ restaurantId: checked.restaurantId, name, role: "ADMIN", ...(await hashPin(pin)) });
    await clearInvite(checked.restaurantId);
    await startSession(admin);
    return NextResponse.json({ ok: true, redirectTo: appPath(found.restaurant.slug, homePathFor("ADMIN")) }, { status: 201 });
  });
}
