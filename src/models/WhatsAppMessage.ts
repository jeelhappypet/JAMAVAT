import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";
import { WHATSAPP_MESSAGE_STATUSES } from "@/types";

const whatsAppMessageSchema = new Schema(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "WhatsAppConversation", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "WhatsAppCustomer", required: true },
    direction: { type: String, enum: ["inbound", "outbound"], required: true },
    channel: { type: String, enum: ["whatsapp"], default: "whatsapp" },
    /** Meta's message id ("wamid…") — the idempotency key for webhook retries. */
    whatsappMessageId: { type: String, required: true },
    messageType: { type: String, required: true },
    text: { type: String, default: "" },
    /** Media id for image/audio/video/document/sticker (downloadable later via the Graph API). */
    media: { id: { type: String }, mimeType: { type: String } },
    /** Inbound: "received". Outbound: accepted (by Meta) → sent → delivered → read, or failed. */
    status: { type: String, enum: WHATSAPP_MESSAGE_STATUSES, required: true },
    statusAt: { type: Date },
    error: { code: { type: Number }, title: { type: String }, message: { type: String } },
    /** wa_id or our phone_number_id. */
    sender: { type: String, required: true },
    recipient: { type: String, required: true },
    /** Staff member who sent an outbound message. */
    sentBy: { id: { type: Schema.Types.ObjectId, ref: "Staff" }, name: { type: String } },
    /** When WhatsApp says it happened (inbound) or when Meta accepted it (outbound). */
    timestamp: { type: Date, required: true },
    /** Meta's object for this single inbound message — kept for debugging new message types. */
    rawPayload: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

whatsAppMessageSchema.index({ whatsappMessageId: 1 }, { unique: true });
whatsAppMessageSchema.index({ conversationId: 1, timestamp: -1 });

export type WhatsAppMessageDocument = InferSchemaType<typeof whatsAppMessageSchema> & { _id: Types.ObjectId };

export const WhatsAppMessage = models.WhatsAppMessage || model("WhatsAppMessage", whatsAppMessageSchema);
