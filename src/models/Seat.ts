import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";
import { tenantField, tenantGuard } from "@/lib/db/tenant";

/**
 * One QR code: a side of a table ("4A"). The QR encodes `token`, a random
 * secret — never the table number — so nobody can order for 4A from home.
 * Regenerating the token kills a copied/photographed sticker.
 *
 * `currentSessionId` is the lock: one guest (device) per QR at a time,
 * from their first order until the counter settles or frees it.
 */
const seatSchema = new Schema(
  {
    restaurantId: tenantField,
    tableId: { type: Schema.Types.ObjectId, ref: "Table", required: true },
    label: { type: String, required: true, trim: true },
    token: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    currentSessionId: { type: Schema.Types.ObjectId, ref: "GuestSession", default: null },
  },
  { timestamps: true }
);

seatSchema.plugin(tenantGuard);

seatSchema.index({ token: 1 }, { unique: true });
seatSchema.index({ tableId: 1, label: 1 }, { unique: true });
seatSchema.index({ restaurantId: 1, tableId: 1 });

export type SeatDocument = InferSchemaType<typeof seatSchema> & { _id: Types.ObjectId };

export const Seat = models.Seat || model("Seat", seatSchema);
