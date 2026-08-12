import { Schema, model, models, type InferSchemaType } from "mongoose";
import { MENU_CATEGORIES } from "@/types";

const menuItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: MENU_CATEGORIES },
    price: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

menuItemSchema.index({ category: 1, isActive: 1 });

export type MenuItemDocument = InferSchemaType<typeof menuItemSchema>;

export const MenuItem = models.MenuItem || model("MenuItem", menuItemSchema);
