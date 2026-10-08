import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

/** A top-level menu such as "Gujarati" or "Punjabi". With a single menu, guests never see menu tabs. */
const menuSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    nameGu: { type: String, trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    /** Set only on the menu the v1 → v2 migration creates, so concurrent first loads upsert one doc. */
    legacyKey: { type: String },
  },
  { timestamps: true }
);

menuSchema.index({ legacyKey: 1 }, { unique: true, sparse: true });
menuSchema.index({ sortOrder: 1 });

export type MenuDocument = InferSchemaType<typeof menuSchema> & { _id: Types.ObjectId };

export const Menu = models.Menu || model("Menu", menuSchema);
