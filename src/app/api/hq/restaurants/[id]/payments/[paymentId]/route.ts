import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Restaurant, type RestaurantDocument } from "@/models/Restaurant";
import { SubscriptionPayment, type SubscriptionPaymentDocument } from "@/models/SubscriptionPayment";
import { requireHq } from "@/lib/hq/guard";
import { getRestaurantForHq, recomputePaidUntil } from "@/lib/hq/restaurants";
import { updatePaymentSchema } from "@/lib/validation/hq";
import { forgetRestaurantInfo } from "@/lib/restaurant";
import { sendPaymentReceiptEmail } from "@/lib/hq/invoiceEmail";
import { logActivity } from "@/lib/hq/activity";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";
import type { BillingCycle, SubscriptionPaymentMethod } from "@/types";

type Params = { params: Promise<{ id: string; paymentId: string }> };

/**
 * Edits a recorded payment (amount, method, months, date, note) — any
 * payment, not just the latest. `Restaurant.paidUntil` and every later
 * payment's own `paidUntil` are rebuilt from the full chain afterward, so a
 * correction to an old payment correctly reflows everything after it.
 */
export async function PATCH(request: Request, { params }: Params) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    const { id, paymentId } = await params;
    if (!isValidObjectId(id) || !isValidObjectId(paymentId)) return jsonError(t("err.notFound"), 404);
    const patch = updatePaymentSchema.parse(await request.json());

    await connectToDatabase();
    const [restaurant, payment] = await Promise.all([
      Restaurant.findById(id).lean<RestaurantDocument>(),
      SubscriptionPayment.findOne({ _id: paymentId, restaurantId: id }).lean<SubscriptionPaymentDocument>(),
    ]);
    if (!restaurant || !payment) return jsonError(t("err.notFound"), 404);

    const set: Record<string, unknown> = {};
    if (patch.amount !== undefined) set.amount = patch.amount;
    if (patch.method !== undefined) set.method = patch.method;
    if (patch.months !== undefined) set.months = patch.months;
    if (patch.cycle !== undefined) set.cycle = patch.cycle;
    if (patch.note !== undefined) set.note = patch.note;
    if (patch.paidAt !== undefined) set.paidAt = new Date(`${patch.paidAt}T12:00:00.000Z`);
    if (Object.keys(set).length) await SubscriptionPayment.updateOne({ _id: paymentId }, { $set: set });

    const paidUntil = await recomputePaidUntil(id);
    forgetRestaurantInfo(id);

    if (restaurant.ownerEmail) {
      const updated = await SubscriptionPayment.findById(paymentId).lean<SubscriptionPaymentDocument>();
      if (updated) {
        await sendPaymentReceiptEmail(restaurant.ownerEmail, {
          restaurantName: restaurant.name,
          amount: updated.amount,
          method: updated.method as SubscriptionPaymentMethod,
          cycle: (updated.cycle ?? "MONTHLY") as BillingCycle,
          months: updated.months,
          paidAt: updated.paidAt,
          paidUntil: updated.paidUntil,
        });
      }
    }
    await logActivity({
      hqEmail: hq,
      action: "payment.edited",
      summary: `Edited a payment for ${restaurant.name} (${Object.keys(set).join(", ") || "no changes"})`,
      restaurantId: id,
      restaurantName: restaurant.name,
    });

    return NextResponse.json({ restaurant: await getRestaurantForHq(id), paidUntil });
  });
}

/** Removes a payment and rebuilds `paidUntil` from whatever's left — every other payment, in order, from the trial anchor. */
export async function DELETE(_request: Request, { params }: Params) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    const { id, paymentId } = await params;
    if (!isValidObjectId(id) || !isValidObjectId(paymentId)) return jsonError(t("err.notFound"), 404);

    await connectToDatabase();
    const [restaurant, payment] = await Promise.all([
      Restaurant.findById(id).lean<RestaurantDocument>(),
      SubscriptionPayment.findOne({ _id: paymentId, restaurantId: id }).lean<SubscriptionPaymentDocument>(),
    ]);
    if (!restaurant || !payment) return jsonError(t("err.notFound"), 404);

    await SubscriptionPayment.deleteOne({ _id: paymentId });
    await recomputePaidUntil(id);
    forgetRestaurantInfo(id);

    await logActivity({
      hqEmail: hq,
      action: "payment.deleted",
      summary: `Deleted a ₹${payment.amount.toLocaleString("en-IN")} payment for ${restaurant.name}`,
      restaurantId: id,
      restaurantName: restaurant.name,
    });

    return NextResponse.json({ restaurant: await getRestaurantForHq(id) });
  });
}
