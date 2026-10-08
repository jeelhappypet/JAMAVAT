import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

const menuItemSchema = new Schema(
  {
    // Required for everything created in v2; v1 items get it from the
    // migration in lib/menu/structure.ts.
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    /** v1's hardcoded category string. Left in place so v1 code reading the same DB keeps working. */
    category: { type: String },
    name: { type: String, required: true, trim: true },
    nameGu: { type: String, trim: true },
    /** One line under the dish name on the guest menu ("2 shaak, dal, rice…"). */
    description: { type: String, trim: true },
    descriptionGu: { type: String, trim: true },
    /** Small "Bestseller" tag on the guest menu. */
    isBestseller: { type: Boolean, default: false },
    /** Public Vercel Blob URL of the dish photo (480×400 WebP, resized in the browser). */
    imageUrl: { type: String },
    price: { type: Number, required: true, min: 0 },
    isVeg: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

menuItemSchema.index({ categoryId: 1, isActive: 1 });

export type MenuItemDocument = InferSchemaType<typeof menuItemSchema> & { _id: Types.ObjectId };

export const MenuItem = models.MenuItem || model("MenuItem", menuItemSchema);
