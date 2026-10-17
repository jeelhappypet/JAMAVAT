import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

/**
 * A one-time code emailed to a guest (or to an HQ admin). Stored hashed;
 * MongoDB's TTL index removes it after expiry.
 *
 * `scope` keeps codes apart: `r:<restaurantId>` for a guest at one
 * restaurant, `hq` for the Jamavat owner's own login. A code is only ever
 * looked up inside the scope it was sent for, so one can't be replayed
 * somewhere else — and the send limits are counted per scope too.
 *
 * Not a tenant collection: HQ codes belong to no restaurant, so the scope
 * string carries the separation instead of `restaurantId`.
 */
const emailOtpSchema = new Schema(
  {
    scope: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

emailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
emailOtpSchema.index({ scope: 1, email: 1, createdAt: -1 });

export type EmailOtpDocument = InferSchemaType<typeof emailOtpSchema> & { _id: Types.ObjectId; createdAt: Date };

export const EmailOtp = models.EmailOtp || model("EmailOtp", emailOtpSchema);

/** The scope a guest's code at one restaurant lives in. */
export function guestOtpScope(restaurantId: unknown): string {
  return `r:${String(restaurantId)}`;
}

/** The Jamavat owner's own login codes. */
export const HQ_OTP_SCOPE = "hq";
