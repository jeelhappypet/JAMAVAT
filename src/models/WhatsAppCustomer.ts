import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";
import { tenantField, tenantGuard } from "@/lib/db/tenant";

/**
 * Someone who has messaged the restaurant's WhatsApp number. Separate from
 * the QR guest flow (GuestSession) on purpose — matched only by wa_id.
 */
const whatsAppCustomerSchema = new Schema(
  {
    restaurantId: tenantField,
    /** WhatsApp profile name; refreshed whenever Meta sends a newer one. */
    name: { type: String, trim: true },
    /** "+919876543210" — for display and search. */
    phone: { type: String, required: true },
    /** Digits only, as WhatsApp addresses it ("919876543210"). */
    whatsappNumber: { type: String, required: true },
    /** Meta's wa_id — the identity we match on. */
    whatsappWaId: { type: String, required: true },
  },
  { timestamps: true }
);

whatsAppCustomerSchema.plugin(tenantGuard);

whatsAppCustomerSchema.index({ restaurantId: 1, whatsappWaId: 1 }, { unique: true });
whatsAppCustomerSchema.index({ restaurantId: 1, phone: 1 });

export type WhatsAppCustomerDocument = InferSchemaType<typeof whatsAppCustomerSchema> & { _id: Types.ObjectId };

export const WhatsAppCustomer = models.WhatsAppCustomer || model("WhatsAppCustomer", whatsAppCustomerSchema);
