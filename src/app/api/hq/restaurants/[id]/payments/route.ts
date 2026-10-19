import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Restaurant, type RestaurantDocument } from "@/models/Restaurant";
import { SubscriptionPayment, type SubscriptionPaymentDocument } from "@/models/SubscriptionPayment";
import { requireHq } from "@/lib/hq/guard";
import { captureTrialAnchor, getRestaurantForHq, recomputePaidUntil } from "@/lib/hq/restaurants";
import { recordPaymentSchema } from "@/lib/validation/hq";
import { extendPaidUntil } from "@/lib/subscription";
import { forgetRestaurantInfo } from "@/lib/restaurant";
import { sendPaymentReceiptEmail } from "@/lib/hq/invoiceEmail";
import { logActivity } from "@/lib/hq/activity";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";
import type { SubscriptionPaymentDTO, SubscriptionPaymentMethod, BillingCycle } from "@/types";

type Params = { params: Promise<{ id: string }> };

export function toPaymentDTO(doc: SubscriptionPaymentDocument): SubscriptionPaymentDTO {
  return {
    id: String(doc._id),
    amount: doc.amount,
    method: doc.method as SubscriptionPaymentMethod,
    cycle: (doc.cycle ?? "MONTHLY") as BillingCycle,
    months: doc.months,
    paidAt: doc.paidAt.toISOString(),
    paidUntil: doc.paidUntil.toISOString(),
    note: doc.note || undefined,
    recordedBy: doc.recordedBy || undefined,
  };
}

export async function GET(_request: Request, { params }: Params) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    await connectToDatabase();
    const payments = await SubscriptionPayment.find({ restaurantId: id }).sort({ paidAt: -1 }).limit(50).lean<SubscriptionPaymentDocument[]>();
    return NextResponse.json({ payments: payments.map(toPaymentDTO) });
  });
}

/**
 * HQ records a payment it has received (UPI, cash, bank transfer). The
 * payment extends the restaurant's period — from the current end if it
 * hasn't passed, otherwise from today — and switches a trial to ACTIVE.
 * Razorpay (phase 5E) will write the same row from its webhook.
 */
export async function POST(request: Request, { params }: Params) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    const input = recordPaymentSchema.parse(await request.json());

    await connectToDatabase();
    const restaurant = await Restaurant.findById(id).lean<RestaurantDocument>();
    if (!restaurant) return jsonError(t("err.notFound"), 404);

    // This is the last moment `paidUntil` is guaranteed to still be the pre-payment value — freeze
    // it as the anchor before creating the first payment, so a later edit/delete has somewhere
    // correct to recompute from (recomputePaidUntil below only ever looks at trialEndsAt by then).
    const isFirstPayment = !(await SubscriptionPayment.exists({ restaurantId: id }));
    if (isFirstPayment) await captureTrialAnchor(id);

    const paidAt = input.paidAt ? new Date(`${input.paidAt}T12:00:00.000Z`) : new Date();
    // A provisional value — recomputePaidUntil below replays the whole chain (handles a backdated paidAt correctly) and is the final word.
    const provisionalPaidUntil = extendPaidUntil(restaurant.paidUntil ?? undefined, input.months, paidAt);

    const created = await SubscriptionPayment.create({
      restaurantId: id,
      planId: restaurant.planId,
      amount: input.amount,
      method: input.method,
      cycle: input.cycle ?? restaurant.billingCycle ?? "MONTHLY",
      months: input.months,
      paidAt,
      paidUntil: provisionalPaidUntil,
      note: input.note,
      recordedBy: hq,
    });
    const paidUntil = (await recomputePaidUntil(id)) ?? provisionalPaidUntil;

    if (restaurant.status === "TRIAL" || restaurant.status === "CANCELLED") {
      await Restaurant.updateOne({ _id: id }, { $set: { status: "ACTIVE" } });
    }
    forgetRestaurantInfo(id);

    if (restaurant.ownerEmail) {
      await sendPaymentReceiptEmail(restaurant.ownerEmail, {
        restaurantName: restaurant.name,
        amount: input.amount,
        method: input.method,
        cycle: created.cycle as BillingCycle,
        months: input.months,
        paidAt,
        paidUntil,
      });
    }
    await logActivity({
      hqEmail: hq,
      action: "payment.recorded",
      summary: `Recorded ₹${input.amount.toLocaleString("en-IN")} (${input.method}) for ${restaurant.name}`,
      restaurantId: id,
      restaurantName: restaurant.name,
    });

    return NextResponse.json({ restaurant: await getRestaurantForHq(id) }, { status: 201 });
  });
}
