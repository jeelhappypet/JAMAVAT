import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

/**
 * A category inside a menu ("Thali", "Paneer"…). Kitchen routing is by
 * category: the admin assigns categories to kitchen logins, and each order
 * item goes to the screens that own its category.
 */
const categorySchema = new Schema(
  {
    menuId: { type: Schema.Types.ObjectId, ref: "Menu", required: true },
    name: { type: String, required: true, trim: true },
    nameGu: { type: String, trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    /** The v1 category string this was migrated from (e.g. "શાક"). */
    legacyKey: { type: String },
  },
  { timestamps: true }
);

categorySchema.index({ menuId: 1, sortOrder: 1 });
categorySchema.index({ legacyKey: 1 }, { unique: true, sparse: true });

export type CategoryDocument = InferSchemaType<typeof categorySchema> & { _id: Types.ObjectId };

export const Category = models.Category || model("Category", categorySchema);
