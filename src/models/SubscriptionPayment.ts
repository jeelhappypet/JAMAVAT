import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";
import { BILLING_CYCLES, SUBSCRIPTION_PAYMENT_METHODS } from "@/types";

/**
 * Money a restaurant has paid Jamavat. HQ records each payment by hand for
 * now; a payment extends `Restaurant.paidUntil`, and the row stays as the
 * record of what was paid, when and for which period.
 *
 * Razorpay (phase 5E) writes the same rows — `provider`, `providerRef` and
 * `rawPayload` are here so it has somewhere to put its payment id and the
 * webhook body without changing what everything else reads.
 */
const subscriptionPaymentSchema = new Schema(
  {
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant", required: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan" },
    /** ₹ received. */
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, enum: SUBSCRIPTION_PAYMENT_METHODS, required: true },
    cycle: { type: String, enum: BILLING_CYCLES, default: "MONTHLY" },
    /** How many months this payment bought. */
    months: { type: Number, required: true, min: 1, max: 36 },
    paidAt: { type: Date, required: true },
    /** The period end this payment moved the restaurant to — what the HQ list shows. */
    paidUntil: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 300 },
    /** Who recorded it: an HQ email, or "razorpay" once that lands. */
    recordedBy: { type: String, trim: true },

    provider: { type: String, trim: true },
    providerRef: { type: String, trim: true },
    rawPayload: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

subscriptionPaymentSchema.index({ restaurantId: 1, paidAt: -1 });
// A provider's payment id lands once, however many times its webhook fires.
subscriptionPaymentSchema.index({ provider: 1, providerRef: 1 }, { unique: true, sparse: true });

export type SubscriptionPaymentDocument = InferSchemaType<typeof subscriptionPaymentSchema> & { _id: Types.ObjectId; createdAt: Date };

export const SubscriptionPayment = models.SubscriptionPayment || model("SubscriptionPayment", subscriptionPaymentSchema);
