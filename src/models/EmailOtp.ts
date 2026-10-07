import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

/** A one-time code emailed to a guest. Stored hashed; MongoDB's TTL index removes it after expiry. */
const emailOtpSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

emailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
emailOtpSchema.index({ email: 1, createdAt: -1 });

export type EmailOtpDocument = InferSchemaType<typeof emailOtpSchema> & { _id: Types.ObjectId; createdAt: Date };

export const EmailOtp = models.EmailOtp || model("EmailOtp", emailOtpSchema);
