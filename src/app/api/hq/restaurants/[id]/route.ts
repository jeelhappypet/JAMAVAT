import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Restaurant, type RestaurantDocument } from "@/models/Restaurant";
import { Menu } from "@/models/Menu";
import { Category } from "@/models/Category";
import { MenuItem, type MenuItemDocument } from "@/models/MenuItem";
import { Order } from "@/models/Order";
import { Bill } from "@/models/Bill";
import { Staff } from "@/models/Staff";
import { Table } from "@/models/Table";
import { Seat } from "@/models/Seat";
import { GuestSession } from "@/models/GuestSession";
import { WhatsAppConversation } from "@/models/WhatsAppConversation";
import { WhatsAppCustomer } from "@/models/WhatsAppCustomer";
import { WhatsAppMessage } from "@/models/WhatsAppMessage";
import { SubscriptionPayment } from "@/models/SubscriptionPayment";
import { Counter } from "@/models/Counter";
import { ActivityLog } from "@/models/ActivityLog";
import { deleteDishPhoto } from "@/lib/menu/photo";
import { requireHq } from "@/lib/hq/guard";
import { getRestaurantForHq } from "@/lib/hq/restaurants";
import { updateRestaurantSchema } from "@/lib/validation/hq";
import { createInvite, inviteUrl } from "@/lib/auth/invite";
import { sendInviteEmail } from "@/lib/hq/inviteEmail";
import { setOwnerPassword } from "@/lib/auth/account";
import { getBaseUrl } from "@/lib/tables";
import { forgetRestaurantInfo } from "@/lib/restaurant";
import { forgetPlanLimits } from "@/lib/limits";
import { logActivity } from "@/lib/hq/activity";
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
    if (patch.ownerUsername !== undefined) {
      if (patch.ownerUsername) {
        if (await Restaurant.exists({ _id: { $ne: id }, ownerUsername: patch.ownerUsername })) return jsonError("That username is already taken", 409);
        set.ownerUsername = patch.ownerUsername;
      } else unset.ownerUsername = "";
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
    if (patch.newOwnerPassword) await setOwnerPassword(id, patch.newOwnerPassword);
    // Instances keep a restaurant's status and plan for a few seconds; drop this one's copy now.
    forgetRestaurantInfo(id);
    forgetPlanLimits(id);

    const name = (set.name as string) ?? current.name;
    const changedFields = Object.keys(set).filter((key) => key !== "previousSlugs");
    if (changedFields.length || Object.keys(unset).length || patch.newOwnerPassword) {
      const what = patch.newOwnerPassword ? [...changedFields, "ownerPassword"] : changedFields;
      await logActivity({ hqEmail: hq, action: "restaurant.updated", summary: `Updated ${name} (${what.join(", ") || "owner password"})`, restaurantId: id, restaurantName: name });
    }

    return NextResponse.json({ restaurant: await getRestaurantForHq(id), ...(invite ? { invite } : {}) });
  });
}

/**
 * Removes a restaurant completely — every tenant collection it owns,
 * cascaded, then the restaurant itself. There's no soft-delete: the owner
 * chose this deliberately (confirmed by typing the restaurant's name in the
 * HQ dialog before this request is ever sent).
 */
export async function DELETE(_request: Request, { params }: Params) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);

    await connectToDatabase();
    const restaurant = await Restaurant.findById(id).lean<RestaurantDocument>();
    if (!restaurant) return jsonError(t("err.notFound"), 404);

    const photos = await MenuItem.find({ restaurantId: id, imageUrl: { $exists: true } }).select({ imageUrl: 1 }).lean<Pick<MenuItemDocument, "imageUrl">[]>();
    await Promise.all(photos.map((item) => deleteDishPhoto(item.imageUrl)));

    await Promise.all([
      Order.deleteMany({ restaurantId: id }),
      Bill.deleteMany({ restaurantId: id }),
      MenuItem.deleteMany({ restaurantId: id }),
      Category.deleteMany({ restaurantId: id }),
      Menu.deleteMany({ restaurantId: id }),
      Staff.deleteMany({ restaurantId: id }),
      Seat.deleteMany({ restaurantId: id }),
      Table.deleteMany({ restaurantId: id }),
      GuestSession.deleteMany({ restaurantId: id }),
      WhatsAppMessage.deleteMany({ restaurantId: id }),
      WhatsAppConversation.deleteMany({ restaurantId: id }),
      WhatsAppCustomer.deleteMany({ restaurantId: id }),
      SubscriptionPayment.deleteMany({ restaurantId: id }),
      ActivityLog.deleteMany({ restaurantId: id }),
      Counter.deleteMany({ _id: { $regex: `^${id}:` } }),
    ]);
    await Restaurant.deleteOne({ _id: id });

    forgetRestaurantInfo(id);
    forgetPlanLimits(id);
    await logActivity({ hqEmail: hq, action: "restaurant.deleted", summary: `Deleted ${restaurant.name} (/r/${restaurant.slug})` });

    return NextResponse.json({ ok: true });
  });
}
