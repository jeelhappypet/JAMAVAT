import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

/**
 * One sitting at one QR: opens with the first order, closes when settled or
 * freed. A guest opens it from their phone (verified email); the counter can
 * also open it for a walk-in table — then there's no email and the device is
 * the counter, so every phone that scans the QR sees "in use".
 */
const guestSessionSchema = new Schema(
  {
    seatId: { type: Schema.Types.ObjectId, ref: "Seat", required: true },
    seatCode: { type: String, required: true },
    /** The guest's verified email; absent when the counter opened the sitting. */
    email: { type: String, lowercase: true, trim: true },
    /** Random id from the guest's signed cookie — the lock belongs to this device, not to the email. `counter:<staffId>` for a counter sitting. */
    deviceId: { type: String, required: true },
    openedBy: { type: String, enum: ["GUEST", "COUNTER"], default: "GUEST" },
    status: { type: String, enum: ["OPEN", "CLOSED"], default: "OPEN" },
    closedAt: { type: Date },
    closedReason: { type: String, enum: ["FREED", "SETTLED"] },
  },
  { timestamps: true }
);

guestSessionSchema.index({ seatId: 1, status: 1 });
// Per-sitting email verification and the guest's "thank you" screen look sessions up by phone.
guestSessionSchema.index({ deviceId: 1, status: 1, closedAt: -1 });

export type GuestSessionDocument = InferSchemaType<typeof guestSessionSchema> & { _id: Types.ObjectId; createdAt: Date };

export const GuestSession = models.GuestSession || model("GuestSession", guestSessionSchema);
