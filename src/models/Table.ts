import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

/** A physical table. Each side of it gets its own QR (a Seat: 4A, 4B…). */
const tableSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    area: { type: String, trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

tableSchema.index({ sortOrder: 1 });

export type TableDocument = InferSchemaType<typeof tableSchema> & { _id: Types.ObjectId };

export const Table = models.Table || model("Table", tableSchema);
