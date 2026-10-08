import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";

export const WHATSAPP_CONVERSATION_STATUSES = ["open", "closed"] as const;

const whatsAppConversationSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "WhatsAppCustomer", required: true },
    /** Copies of the customer's name and wa_id, so the inbox list and its search need no join. */
    customerName: { type: String, trim: true },
    customerWaId: { type: String, required: true },
    channel: { type: String, enum: ["whatsapp"], default: "whatsapp" },
    /** Which of our WhatsApp numbers this chat is on. */
    whatsappPhoneNumberId: { type: String, required: true },
    status: { type: String, enum: WHATSAPP_CONVERSATION_STATUSES, default: "open" },
    /** Preview line for the inbox list. */
    lastMessage: { type: String, default: "" },
    lastMessageDirection: { type: String, enum: ["inbound", "outbound"] },
    lastMessageAt: { type: Date },
    /** Last message from the customer: free-form replies are allowed for 24 h after it (WhatsApp rule). */
    lastInboundAt: { type: Date },
    unreadCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

whatsAppConversationSchema.index({ lastMessageAt: -1 });
// One open chat per customer per number; two webhooks racing on a new customer can't make two.
whatsAppConversationSchema.index(
  { customerId: 1, channel: 1, whatsappPhoneNumberId: 1 },
  { unique: true, partialFilterExpression: { status: "open" } }
);

export type WhatsAppConversationDocument = InferSchemaType<typeof whatsAppConversationSchema> & { _id: Types.ObjectId };

export const WhatsAppConversation = models.WhatsAppConversation || model("WhatsAppConversation", whatsAppConversationSchema);
