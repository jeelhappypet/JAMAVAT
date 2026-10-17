import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Restaurant, type RestaurantDocument } from "@/models/Restaurant";
import { SubscriptionPayment, type SubscriptionPaymentDocument } from "@/models/SubscriptionPayment";
import { requireHq } from "@/lib/hq/guard";
import { getRestaurantForHq } from "@/lib/hq/restaurants";
import { recordPaymentSchema } from "@/lib/validation/hq";
import { extendPaidUntil } from "@/lib/subscription";
import { forgetRestaurantInfo } from "@/lib/restaurant";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";
import type { SubscriptionPaymentDTO, SubscriptionPaymentMethod, BillingCycle } from "@/types";

type Params = { params: Promise<{ id: string }> };

function toDTO(doc: SubscriptionPaymentDocument): SubscriptionPaymentDTO {
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
    return NextResponse.json({ payments: payments.map(toDTO) });
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

    const paidAt = input.paidAt ? new Date(`${input.paidAt}T12:00:00.000Z`) : new Date();
    const paidUntil = extendPaidUntil(restaurant.paidUntil ?? undefined, input.months, paidAt);

    await SubscriptionPayment.create({
      restaurantId: id,
      planId: restaurant.planId,
      amount: input.amount,
      method: input.method,
      cycle: input.cycle ?? restaurant.billingCycle ?? "MONTHLY",
      months: input.months,
      paidAt,
      paidUntil,
      note: input.note,
      recordedBy: hq,
    });

    await Restaurant.updateOne(
      { _id: id },
      { $set: { paidUntil, ...(restaurant.status === "TRIAL" || restaurant.status === "CANCELLED" ? { status: "ACTIVE" } : {}) } }
    );
    forgetRestaurantInfo(id);

    return NextResponse.json({ restaurant: await getRestaurantForHq(id) }, { status: 201 });
  });
}
