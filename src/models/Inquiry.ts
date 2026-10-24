import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";
import { INQUIRY_STATUSES } from "@/types";

/**
 * A restaurant owner asking for a demo from the Jamavat website. Belongs to
 * HQ, not to any restaurant, so it isn't tenant-scoped.
 *
 * `phoneKey` (digits only) is unique per open inquiry: the same owner filling
 * the form twice in a day updates one row instead of making two, and HQ's
 * list stays readable.
 */
const inquirySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    /** Last 10 digits of the phone — what the de-dupe and HQ's search match on. */
    phoneKey: { type: String, required: true },
    restaurantName: { type: String, trim: true },
    city: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    tables: { type: String, trim: true },
    kitchens: { type: String, trim: true },
    message: { type: String, trim: true, maxlength: 1000 },

    status: { type: String, enum: INQUIRY_STATUSES, default: "NEW" },
    /** HQ's own notes and who they turned into (set when a restaurant is created from it). */
    notes: { type: String, trim: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant" },

    /**
     * The day HQ means to come back to this one. Website inquiries get it
     * when HQ sets it; a lead HQ added itself usually gets it straight away,
     * because the whole job of outbound selling is the second call.
     */
    followUpAt: { type: Date },

    /** Which page and campaign the form was filled from, for knowing what works. */
    source: { type: String, trim: true },
    utm: { type: Map, of: String },
    /** Language the website was in — HQ calls back in the one they read. */
    lang: { type: String, enum: ["en", "gu"], default: "en" },
    contactedAt: { type: Date },
  },
  { timestamps: true }
);

inquirySchema.index({ status: 1, createdAt: -1 });
inquirySchema.index({ createdAt: -1 });
inquirySchema.index({ phoneKey: 1, status: 1 });
// "What do I have to do today" — the list HQ opens in the morning.
inquirySchema.index({ followUpAt: 1, status: 1 });

export type InquiryDocument = InferSchemaType<typeof inquirySchema> & { _id: Types.ObjectId; createdAt: Date };

export const Inquiry = models.Inquiry || model("Inquiry", inquirySchema);
