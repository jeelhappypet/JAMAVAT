import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";
import { PAYMENT_MODES } from "@/types";

const billLineSchema = new Schema(
  {
    name: { type: String, required: true },
    nameGu: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

/**
 * A settled QR seat: every order of one guest's sitting rolled into one bill.
 * Written when the counter taps "Settle & free table" — the source for the
 * thank-you email and the payment-mode split in reports. Parcel orders are
 * paid when ordering and never get a Bill.
 */
const billSchema = new Schema(
  {
    billNo: { type: Number, required: true },
    businessDate: { type: String, required: true },
    seatId: { type: Schema.Types.ObjectId, ref: "Seat", required: true },
    seatCode: { type: String, required: true },
    guestSessionId: { type: Schema.Types.ObjectId, ref: "GuestSession", required: true },
    email: { type: String, lowercase: true, trim: true },
    orderIds: [{ type: Schema.Types.ObjectId, ref: "Order" }],
    lines: { type: [billLineSchema], default: [] },
    itemsTotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentMode: { type: String, enum: PAYMENT_MODES, required: true },
    emailStatus: { type: String, enum: ["SENT", "FAILED", "SKIPPED"], default: "SKIPPED" },
    settledBy: { type: Schema.Types.ObjectId, ref: "Staff" },
    settledAt: { type: Date, required: true },
  },
  { timestamps: true }
);

billSchema.index({ billNo: 1 }, { unique: true });
billSchema.index({ businessDate: 1 });
// One bill per sitting — a double tap on "Settle" can't bill the same guest twice.
billSchema.index({ guestSessionId: 1 }, { unique: true });

export type BillDocument = InferSchemaType<typeof billSchema> & { _id: Types.ObjectId };

export const Bill = models.Bill || model("Bill", billSchema);
