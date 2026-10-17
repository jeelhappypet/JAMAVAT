import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";
import { tenantField, tenantGuard } from "@/lib/db/tenant";

/** A physical table. Each side of it gets its own QR (a Seat: 4A, 4B…). */
const tableSchema = new Schema(
  {
    restaurantId: tenantField,
    name: { type: String, required: true, trim: true },
    area: { type: String, trim: true },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

tableSchema.plugin(tenantGuard);

tableSchema.index({ restaurantId: 1, sortOrder: 1 });

export type TableDocument = InferSchemaType<typeof tableSchema> & { _id: Types.ObjectId };

export const Table = models.Table || model("Table", tableSchema);
