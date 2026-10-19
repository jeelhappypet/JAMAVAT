import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

/**
 * What HQ did, across all restaurants — not tenant-scoped (HQ's own audit
 * trail, read from the Activity panel in HqHeader). A restaurant's row is
 * best-effort removed when it's deleted (see the restaurant DELETE route);
 * `restaurantName` is kept as a snapshot so old entries still read fine
 * after that.
 */
const activityLogSchema = new Schema(
  {
    hqEmail: { type: String, required: true, trim: true },
    /** Short machine tag, e.g. "restaurant.created", "payment.edited". */
    action: { type: String, required: true, trim: true },
    /** One line for the panel — already worded, not reassembled from `action`. */
    summary: { type: String, required: true, trim: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: "Restaurant" },
    restaurantName: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ restaurantId: 1, createdAt: -1 });

export type ActivityLogDocument = InferSchemaType<typeof activityLogSchema> & { _id: Types.ObjectId; createdAt: Date };

export const ActivityLog = models.ActivityLog || model("ActivityLog", activityLogSchema);
