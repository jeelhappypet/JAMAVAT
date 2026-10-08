import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";
import { STAFF_ROLES } from "@/types";

const staffSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, enum: STAFF_ROLES },
    pinHash: { type: String, required: true },
    pinSalt: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    /**
     * Baked into every session cookie. Bumping it (PIN change/reset, role
     * change, deactivation, "log out everywhere") invalidates every cookie
     * issued before — sessions otherwise never expire until logout.
     */
    sessionVersion: { type: Number, default: 1 },
    /** Kitchen routing: which categories' items this login's kitchen screen receives. */
    categoryIds: { type: [Schema.Types.ObjectId], ref: "Category", default: [] },
    failedPinAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
  },
  { timestamps: true }
);

// Names are what staff pick on the login screen, so they must be unambiguous.
staffSchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });
staffSchema.index({ isActive: 1, name: 1 });

export type StaffDocument = InferSchemaType<typeof staffSchema> & { _id: Types.ObjectId };

export const Staff = models.Staff || model("Staff", staffSchema);
