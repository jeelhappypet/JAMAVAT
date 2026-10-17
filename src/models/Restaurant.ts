import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";
import { BILLING_CYCLES, RESTAURANT_STATUSES } from "@/types";

/**
 * One customer of Jamavat. Everything a restaurant owns (menus, staff,
 * tables, orders, bills…) points here with `restaurantId`. Not tenant-scoped
 * itself — HQ lists all of them.
 *
 * Subscription: `status` is what HQ set (TRIAL / ACTIVE / SUSPENDED /
 * CANCELLED); `paidUntil` is when the trial or the paid period ends (empty =
 * no end date, e.g. the first restaurant). Whether the restaurant may take
 * orders right now is computed from both plus `graceDays` — see
 * lib/subscription.ts.
 */
const restaurantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    /** `/r/{slug}` — lower-case letters, digits and dashes. */
    slug: { type: String, required: true, lowercase: true, trim: true },
    /** Old slugs keep redirecting after HQ renames one (installed apps, bookmarks). */
    previousSlugs: { type: [String], default: [] },
    status: { type: String, enum: RESTAURANT_STATUSES, default: "TRIAL" },
    planId: { type: Schema.Types.ObjectId, ref: "Plan" },
    billingCycle: { type: String, enum: BILLING_CYCLES, default: "MONTHLY" },
    paidUntil: { type: Date },
    /** Days after `paidUntil` the restaurant keeps working while the payment comes in. */
    graceDays: { type: Number, default: 7, min: 0, max: 60 },

    /** Footer of the thank-you email. */
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    /** "Rate us on Google" button in the thank-you email; hidden when empty. */
    reviewUrl: { type: String, trim: true },
    city: { type: String, trim: true },

    /** Who HQ deals with — never shown to guests. */
    ownerName: { type: String, trim: true },
    ownerEmail: { type: String, trim: true, lowercase: true },
    ownerPhone: { type: String, trim: true },
    /** HQ's own notes about this customer. */
    notes: { type: String, trim: true },
    inquiryId: { type: Schema.Types.ObjectId, ref: "Inquiry" },

    /** One-time link that lets the owner create the first admin login (hashed). */
    invite: {
      tokenHash: { type: String },
      expiresAt: { type: Date },
    },

    /** The WhatsApp Cloud API number whose webhook events belong to this restaurant. */
    whatsappPhoneNumberId: { type: String, trim: true },
    /** The restaurant that existed before Jamavat served many (data migrated in place). */
    legacy: { type: Boolean },
  },
  { timestamps: true }
);

restaurantSchema.index({ slug: 1 }, { unique: true });
restaurantSchema.index({ previousSlugs: 1 });
restaurantSchema.index({ whatsappPhoneNumberId: 1 }, { sparse: true });
restaurantSchema.index({ "invite.tokenHash": 1 }, { sparse: true });

export type RestaurantDocument = InferSchemaType<typeof restaurantSchema> & { _id: Types.ObjectId; createdAt: Date };

export const Restaurant = models.Restaurant || model("Restaurant", restaurantSchema);
