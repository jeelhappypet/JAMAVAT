import { isDuplicateKeyError } from "@/lib/api";
import type { RestaurantRef } from "@/lib/db/tenant";
import { WhatsAppCustomer, type WhatsAppCustomerDocument } from "@/models/WhatsAppCustomer";
import { WhatsAppConversation, type WhatsAppConversationDocument } from "@/models/WhatsAppConversation";
import { WhatsAppMessage, type WhatsAppMessageDocument } from "@/models/WhatsAppMessage";
import type { WhatsAppConversationDTO, WhatsAppMessageDTO, WhatsAppMessageStatus } from "@/types";
import type { InboundMessage, StatusUpdate } from "./webhook";

/** WhatsApp's customer-service window: free-form replies only within 24 h of the customer's last message. */
export const REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Outbound status order — a late "delivered" must never overwrite "read". */
const STATUS_RANK: Record<WhatsAppMessageStatus, number> = { received: 0, accepted: 0, sent: 1, delivered: 2, read: 3, failed: 4 };

export function toConversationDTO(doc: WhatsAppConversationDocument): WhatsAppConversationDTO {
  return {
    id: String(doc._id),
    customerId: String(doc.customerId),
    customerName: doc.customerName || undefined,
    waId: doc.customerWaId,
    status: doc.status === "closed" ? "closed" : "open",
    lastMessage: doc.lastMessage ?? "",
    lastMessageDirection: doc.lastMessageDirection ?? undefined,
    lastMessageAt: doc.lastMessageAt?.toISOString(),
    replyWindowEndsAt: doc.lastInboundAt ? new Date(doc.lastInboundAt.getTime() + REPLY_WINDOW_MS).toISOString() : undefined,
    unreadCount: doc.unreadCount ?? 0,
  };
}

export function toMessageDTO(doc: WhatsAppMessageDocument): WhatsAppMessageDTO {
  return {
    id: String(doc._id),
    conversationId: String(doc.conversationId),
    direction: doc.direction as WhatsAppMessageDTO["direction"],
    whatsappMessageId: doc.whatsappMessageId,
    messageType: doc.messageType,
    text: doc.text ?? "",
    status: doc.status as WhatsAppMessageStatus,
    error: doc.error?.code || doc.error?.title || doc.error?.message ? { code: doc.error.code ?? undefined, title: doc.error.title ?? undefined, message: doc.error.message ?? undefined } : undefined,
    sentBy: doc.sentBy?.name || undefined,
    timestamp: doc.timestamp.toISOString(),
  };
}

/** Finds the customer by wa_id, or creates them. Keeps their WhatsApp profile name current. */
async function upsertCustomer(restaurantId: RestaurantRef, waId: string, profileName?: string): Promise<WhatsAppCustomerDocument> {
  const filter = { restaurantId, whatsappWaId: waId };
  const update = {
    $setOnInsert: { ...filter, whatsappNumber: waId, phone: `+${waId}` },
    ...(profileName ? { $set: { name: profileName } } : {}),
  };
  try {
    return (await WhatsAppCustomer.findOneAndUpdate(filter, update, { upsert: true, returnDocument: "after" }).lean<WhatsAppCustomerDocument>())!;
  } catch (error) {
    // Two webhooks raced to create the same customer — the other one won.
    if (!isDuplicateKeyError(error)) throw error;
    return (await WhatsAppCustomer.findOneAndUpdate(filter, profileName ? { $set: { name: profileName } } : {}, { returnDocument: "after" }).lean<WhatsAppCustomerDocument>())!;
  }
}

/** The customer's open chat on this number, created on first contact (or after the last one was closed). */
async function openConversation(restaurantId: RestaurantRef, customer: WhatsAppCustomerDocument, phoneNumberId: string): Promise<WhatsAppConversationDocument> {
  const filter = { restaurantId, customerId: customer._id, channel: "whatsapp", whatsappPhoneNumberId: phoneNumberId, status: "open" };
  const update = {
    $setOnInsert: { ...filter, customerWaId: customer.whatsappWaId, unreadCount: 0, lastMessage: "" },
    ...(customer.name ? { $set: { customerName: customer.name } } : {}),
  };
  try {
    return (await WhatsAppConversation.findOneAndUpdate(filter, update, { upsert: true, returnDocument: "after" }).lean<WhatsAppConversationDocument>())!;
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    return (await WhatsAppConversation.findOne(filter).lean<WhatsAppConversationDocument>())!;
  }
}

/** Moves the inbox preview forward — never back to an older message that arrived late. */
async function touchConversation(
  restaurantId: RestaurantRef,
  conversationId: unknown,
  at: Date,
  preview: { text: string; direction: "inbound" | "outbound" },
  extra: Record<string, unknown> = {}
): Promise<WhatsAppConversationDocument | null> {
  const bumped = await WhatsAppConversation.findOneAndUpdate(
    { restaurantId, _id: conversationId },
    { $max: { lastMessageAt: at, ...(preview.direction === "inbound" ? { lastInboundAt: at } : {}) }, ...extra },
    { returnDocument: "after" }
  ).lean<WhatsAppConversationDocument>();
  if (!bumped) return null;
  if (bumped.lastMessageAt?.getTime() !== at.getTime()) return bumped;
  return WhatsAppConversation.findOneAndUpdate(
    { restaurantId, _id: conversationId, lastMessageAt: at },
    { $set: { lastMessage: preview.text.slice(0, 200), lastMessageDirection: preview.direction } },
    { returnDocument: "after" }
  ).lean<WhatsAppConversationDocument>();
}

export type InboundResult =
  | { kind: "saved"; conversation: WhatsAppConversationDocument; message: WhatsAppMessageDocument }
  | { kind: "duplicate" };

/**
 * Customer → open conversation → message (unique on Meta's message id) →
 * unread +1 and preview. A webhook retry hits the unique index and stops
 * before touching the conversation, so nothing is counted twice.
 */
export async function saveInboundMessage(restaurantId: RestaurantRef, inbound: InboundMessage): Promise<InboundResult> {
  if (await WhatsAppMessage.exists({ restaurantId, whatsappMessageId: inbound.whatsappMessageId })) return { kind: "duplicate" };

  const customer = await upsertCustomer(restaurantId, inbound.waId, inbound.profileName);
  const conversation = await openConversation(restaurantId, customer, inbound.phoneNumberId);

  let message: WhatsAppMessageDocument;
  try {
    const created = await WhatsAppMessage.create({
      restaurantId,
      conversationId: conversation._id,
      customerId: customer._id,
      direction: "inbound",
      whatsappMessageId: inbound.whatsappMessageId,
      messageType: inbound.messageType,
      text: inbound.text,
      media: inbound.media,
      status: "received",
      sender: inbound.waId,
      recipient: inbound.phoneNumberId,
      timestamp: inbound.timestamp,
      rawPayload: inbound.raw,
    });
    message = created.toObject();
  } catch (error) {
    if (isDuplicateKeyError(error)) return { kind: "duplicate" };
    throw error;
  }

  const updated = await touchConversation(restaurantId, conversation._id, inbound.timestamp, { text: inbound.text, direction: "inbound" }, { $inc: { unreadCount: 1 } });
  return { kind: "saved", conversation: updated ?? conversation, message };
}

/** Saves a message Meta has accepted. Upsert on the wamid, in case its "sent" status raced ahead of us. */
export async function saveOutboundMessage(input: {
  restaurantId: RestaurantRef;
  conversation: WhatsAppConversationDocument;
  whatsappMessageId: string;
  /** For a template or an image this is what the chat should show, not the wire payload. */
  text: string;
  from: string;
  /**
   * Who sent it. `id` is a Staff document, so HQ — which is not a staff
   * member — passes a name only. Putting a non-id there casts to ObjectId and
   * throws *after* Meta has already delivered the message, which looks to the
   * sender like a failure that actually went through.
   */
  staff: { id?: string; name: string };
  /** "text" unless the reply was a template or an image. */
  messageType?: string;
  media?: { id: string; mimeType?: string };
}): Promise<{ conversation: WhatsAppConversationDocument; message: WhatsAppMessageDocument }> {
  const now = new Date();
  const message = (await WhatsAppMessage.findOneAndUpdate(
    { restaurantId: input.restaurantId, whatsappMessageId: input.whatsappMessageId },
    {
      $set: {
        restaurantId: input.restaurantId,
        conversationId: input.conversation._id,
        customerId: input.conversation.customerId,
        direction: "outbound",
        messageType: input.messageType ?? "text",
        text: input.text,
        ...(input.media ? { media: { id: input.media.id, mimeType: input.media.mimeType } } : {}),
        sender: input.from,
        recipient: input.conversation.customerWaId,
        sentBy: { ...(input.staff.id ? { id: input.staff.id } : {}), name: input.staff.name },
        timestamp: now,
      },
      $setOnInsert: { status: "accepted", statusAt: now },
    },
    { upsert: true, returnDocument: "after" }
  ).lean<WhatsAppMessageDocument>())!;
  const conversation = await touchConversation(input.restaurantId, input.conversation._id, now, { text: input.text, direction: "outbound" });
  return { conversation: conversation ?? input.conversation, message };
}

export type StatusResult =
  | { kind: "updated"; message: WhatsAppMessageDocument }
  | { kind: "stale" }
  | { kind: "unknown" };

/**
 * sent → delivered → read only moves forward; "failed" always wins and keeps
 * Meta's error (code/title/details — no secrets in there).
 */
export async function applyStatus(restaurantId: RestaurantRef, update: StatusUpdate): Promise<StatusResult> {
  const lowerRanks = (Object.keys(STATUS_RANK) as WhatsAppMessageStatus[]).filter((status) => STATUS_RANK[status] < STATUS_RANK[update.status]);
  const updated = await WhatsAppMessage.findOneAndUpdate(
    { restaurantId, whatsappMessageId: update.whatsappMessageId, direction: "outbound", status: { $in: lowerRanks } },
    { $set: { status: update.status, statusAt: update.timestamp, ...(update.error ? { error: update.error } : {}) } },
    { returnDocument: "after" }
  ).lean<WhatsAppMessageDocument>();
  if (updated) return { kind: "updated", message: updated };
  return (await WhatsAppMessage.exists({ restaurantId, whatsappMessageId: update.whatsappMessageId })) ? { kind: "stale" } : { kind: "unknown" };
}
