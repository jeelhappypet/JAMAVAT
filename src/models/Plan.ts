import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

const localized = { en: { type: String, trim: true, default: "" }, gu: { type: String, trim: true, default: "" } };

/**
 * A subscription plan, edited in HQ. Public plans show on the website's
 * pricing section (in sortOrder). A limit left empty means unlimited.
 */
const planSchema = new Schema(
  {
    name: localized,
    description: localized,
    /** ₹ per month; 0 = price on request (website shows "Talk to us"). */
    priceMonthly: { type: Number, default: 0, min: 0 },
    /** ₹ per year; 0 = no yearly option. */
    priceYearly: { type: Number, default: 0, min: 0 },
    /** Active QR codes (seats). */
    maxSeats: { type: Number, min: 0 },
    /** Active staff logins. */
    maxStaff: { type: Number, min: 0 },
    /** WhatsApp inbox (needs the restaurant's own WhatsApp Cloud API number). */
    whatsapp: { type: Boolean, default: false },
    /** Bullet points on the pricing card. */
    highlights: { type: [new Schema(localized, { _id: false })], default: [] },
    isPublic: { type: Boolean, default: false },
    /** "Most popular" ribbon on the pricing card. */
    isPopular: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    /** Archived plans stay on the restaurants that have them but can't be picked again. */
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

planSchema.index({ isActive: 1, sortOrder: 1 });

export type PlanDocument = InferSchemaType<typeof planSchema> & { _id: Types.ObjectId };

export const Plan = models.Plan || model("Plan", planSchema);
