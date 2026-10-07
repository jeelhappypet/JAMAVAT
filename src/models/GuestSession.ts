import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

/** One guest's sitting at one QR: opens with their first order, closes when settled or freed. */
const guestSessionSchema = new Schema(
  {
    seatId: { type: Schema.Types.ObjectId, ref: "Seat", required: true },
    seatCode: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    /** Random id from the guest's signed cookie — the lock belongs to this device, not to the email. */
    deviceId: { type: String, required: true },
    status: { type: String, enum: ["OPEN", "CLOSED"], default: "OPEN" },
    closedAt: { type: Date },
    closedReason: { type: String, enum: ["FREED", "SETTLED"] },
  },
  { timestamps: true }
);

guestSessionSchema.index({ seatId: 1, status: 1 });

export type GuestSessionDocument = InferSchemaType<typeof guestSessionSchema> & { _id: Types.ObjectId; createdAt: Date };

export const GuestSession = models.GuestSession || model("GuestSession", guestSessionSchema);
