import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Restaurant } from "@/models/Restaurant";
import { Inquiry } from "@/models/Inquiry";
import { requireHq } from "@/lib/hq/guard";
import { freeSlug, getRestaurantForHq, listRestaurants } from "@/lib/hq/restaurants";
import { createRestaurantSchema } from "@/lib/validation/hq";
import { createInvite, inviteUrl } from "@/lib/auth/invite";
import { sendInviteEmail } from "@/lib/hq/inviteEmail";
import { getBaseUrl } from "@/lib/tables";
import { slugify } from "@/lib/utils/slug";
import { DAY_MS } from "@/lib/subscription";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

export async function GET() {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;
  const t = await getTranslator();
  return respond(t, "err.server", async () => NextResponse.json({ restaurants: await listRestaurants() }));
}

/**
 * Creates a restaurant and the one-time link its owner uses to make the
 * first admin login. Nothing else is set up here: the owner adds menus,
 * tables and staff themselves once they're in.
 */
export async function POST(request: Request) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    const input = createRestaurantSchema.parse(await request.json());
    await connectToDatabase();

    const wanted = input.slug ?? slugify(input.name);
    if (!wanted) return jsonError("That name has no letters a link can use — type the link yourself", 400);
    const slug = input.slug ?? (await freeSlug(wanted));
    if (input.slug && (await Restaurant.exists({ $or: [{ slug }, { previousSlugs: slug }] }))) {
      return jsonError("That link is already taken", 409);
    }

    const trialDays = input.trialDays ?? 14;
    const created = await Restaurant.create({
      name: input.name,
      slug,
      status: "TRIAL",
      planId: input.planId || undefined,
      billingCycle: input.billingCycle ?? "MONTHLY",
      paidUntil: new Date(Date.now() + trialDays * DAY_MS),
      graceDays: 7,
      ownerName: input.ownerName,
      ownerEmail: input.ownerEmail,
      ownerPhone: input.ownerPhone,
      city: input.city,
      inquiryId: input.inquiryId || undefined,
    });

    const token = await createInvite(String(created._id));
    const invite = inviteUrl(await getBaseUrl(), slug, token);
    if (input.sendInvite && input.ownerEmail) await sendInviteEmail(input.ownerEmail, input.name, invite);
    if (input.inquiryId) {
      await Inquiry.updateOne({ _id: input.inquiryId }, { $set: { status: "CONVERTED", restaurantId: created._id } });
    }

    return NextResponse.json({ restaurant: await getRestaurantForHq(String(created._id)), invite }, { status: 201 });
  });
}
