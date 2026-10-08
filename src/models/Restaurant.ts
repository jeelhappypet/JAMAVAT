import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

/**
 * One document for now (single restaurant). Becomes one-per-tenant when the
 * multi-restaurant phase adds `restaurantId` to every other collection.
 */
const restaurantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    /** Footer of the thank-you email. */
    address: { type: String, trim: true },
    phone: { type: String, trim: true },
    /** "Rate us on Google" button in the thank-you email; hidden when empty. */
    reviewUrl: { type: String, trim: true },
  },
  { timestamps: true }
);

export type RestaurantDocument = InferSchemaType<typeof restaurantSchema> & { _id: Types.ObjectId };

export const Restaurant = models.Restaurant || model("Restaurant", restaurantSchema);
