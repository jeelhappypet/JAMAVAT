import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Restaurant, type RestaurantDocument } from "@/models/Restaurant";
import { requireHq } from "@/lib/hq/guard";
import { getRestaurantForHq } from "@/lib/hq/restaurants";
import { updateRestaurantSchema } from "@/lib/validation/hq";
import { createInvite, inviteUrl } from "@/lib/auth/invite";
import { sendInviteEmail } from "@/lib/hq/inviteEmail";
import { getBaseUrl } from "@/lib/tables";
import { forgetRestaurantInfo } from "@/lib/restaurant";
import { forgetPlanLimits } from "@/lib/limits";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    const restaurant = await getRestaurantForHq(id);
    return restaurant ? NextResponse.json({ restaurant }) : jsonError(t("err.notFound"), 404);
  });
}

/**
 * Everything HQ can change about a customer: their plan and period, whether
 * they're switched on, the owner's details and their link. A renamed link
 * keeps redirecting from the old one (`previousSlugs`), so printed QRs,
 * bookmarks and installed apps keep working.
 */
export async function PATCH(request: Request, { params }: Params) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    const patch = updateRestaurantSchema.parse(await request.json());

    await connectToDatabase();
    const current = await Restaurant.findById(id).lean<RestaurantDocument>();
    if (!current) return jsonError(t("err.notFound"), 404);

    const set: Record<string, unknown> = {};
    const unset: Record<string, string> = {};
    for (const key of ["name", "status", "billingCycle", "ownerName", "ownerEmail", "ownerPhone", "city", "notes", "whatsappPhoneNumberId", "graceDays"] as const) {
      if (patch[key] !== undefined) set[key] = patch[key];
    }
    if (patch.planId !== undefined) {
      if (patch.planId) set.planId = patch.planId;
      else unset.planId = "";
    }
    if (patch.paidUntil !== undefined) {
      if (patch.paidUntil) set.paidUntil = new Date(`${patch.paidUntil}T23:59:59.999Z`);
      else unset.paidUntil = "";
    }

    if (patch.slug && patch.slug !== current.slug) {
      if (await Restaurant.exists({ _id: { $ne: id }, $or: [{ slug: patch.slug }, { previousSlugs: patch.slug }] })) {
        return jsonError("That link is already taken", 409);
      }
      set.slug = patch.slug;
      set.previousSlugs = [...new Set([...(current.previousSlugs ?? []), current.slug])];
    }

    let invite: string | undefined;
    if (patch.reinvite) {
      const token = await createInvite(id);
      invite = inviteUrl(await getBaseUrl(), (set.slug as string) ?? current.slug, token);
      if (current.ownerEmail) await sendInviteEmail(current.ownerEmail, (set.name as string) ?? current.name, invite);
    }

    await Restaurant.updateOne({ _id: id }, { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) });
    // Instances keep a restaurant's status and plan for a few seconds; drop this one's copy now.
    forgetRestaurantInfo(id);
    forgetPlanLimits(id);

    return NextResponse.json({ restaurant: await getRestaurantForHq(id), ...(invite ? { invite } : {}) });
  });
}
