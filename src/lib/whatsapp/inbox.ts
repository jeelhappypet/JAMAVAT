import { isValidObjectId, type Types } from "mongoose";
import { getOwnPhoneNumberId } from "./config";
import { toConversationDTO, toMessageDTO } from "./store";
import { WhatsAppConversation, type WhatsAppConversationDocument } from "@/models/WhatsAppConversation";
import { WhatsAppMessage, type WhatsAppMessageDocument } from "@/models/WhatsAppMessage";
import { Restaurant } from "@/models/Restaurant";
import type { WhatsAppConversationDTO, WhatsAppMessageDTO } from "@/types";

/**
 * Reading the WhatsApp inbox, with the restaurant passed in rather than
 * taken from a session — and `null` meaning every restaurant at once.
 *
 * Two callers need the same answers and must not drift apart: a restaurant's
 * own screen, where the id comes from the signed-in staff member, and HQ's,
 * which is one list across the lot. One WhatsApp number serves every
 * restaurant, so from HQ the per-restaurant split is a filing detail, not
 * something to make someone click through.
 *
 * `null` is what `tenantGuard`'s `crossTenant` option exists for: the guard
 * throws on a query with no restaurant in its filter precisely so that
 * reading across restaurants has to be deliberate and visible. It is spelt
 * out on every query below.
 */

export type Scope = Types.ObjectId | string | null;

const LIST_LIMIT = 100;
export const PAGE = 50;

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The restaurant part of a filter, and the option that lets it be left out. */
function scoped(scope: Scope) {
  return {
    filter: scope ? { restaurantId: scope } : {},
    options: scope ? {} : { crossTenant: true },
  };
}

/** Names for the restaurant label on HQ's list, in one query rather than per row. */
async function restaurantNames(ids: unknown[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.map(String))];
  if (unique.length === 0) return new Map();
  const rows = await Restaurant.find({ _id: { $in: unique } })
    .select({ name: 1 })
    .lean<{ _id: Types.ObjectId; name: string }[]>();
  return new Map(rows.map((row) => [String(row._id), row.name]));
}

/** The list, newest first. `q` searches the customer's name and number. */
export async function listConversations(scope: Scope, q?: string): Promise<WhatsAppConversationDTO[]> {
  const { filter: base, options } = scoped(scope);
  const filter: Record<string, unknown> = { ...base };
  const ownNumber = getOwnPhoneNumberId();
  if (ownNumber) filter.whatsappPhoneNumberId = ownNumber;
  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i");
    const digits = q.replace(/\D/g, "");
    filter.$or = [{ customerName: pattern }, ...(digits.length >= 3 ? [{ customerWaId: new RegExp(escapeRegex(digits)) }] : [])];
  }

  const conversations = await WhatsAppConversation.find(filter)
    .setOptions(options)
    .sort({ lastMessageAt: -1 })
    .limit(LIST_LIMIT)
    .select({ restaurantId: 1, customerId: 1, customerName: 1, customerWaId: 1, status: 1, lastMessage: 1, lastMessageDirection: 1, lastMessageAt: 1, lastInboundAt: 1, unreadCount: 1 })
    .lean<WhatsAppConversationDocument[]>();

  // Only HQ's one-list view needs to say which restaurant a chat belongs to.
  const names = scope ? new Map<string, string>() : await restaurantNames(conversations.map((one) => one.restaurantId));
  return conversations.map((one) => ({ ...toConversationDTO(one), restaurantName: names.get(String(one.restaurantId)) }));
}

/** One conversation — null when it is out of scope or on another number. */
export async function findConversation(scope: Scope, id: string): Promise<WhatsAppConversationDocument | null> {
  if (!isValidObjectId(id)) return null;
  const { filter, options } = scoped(scope);
  const conversation = await WhatsAppConversation.findOne({ ...filter, _id: id }).setOptions(options).lean<WhatsAppConversationDocument>();
  if (!conversation) return null;
  const ownNumber = getOwnPhoneNumberId();
  if (ownNumber && conversation.whatsappPhoneNumberId !== ownNumber) return null;
  return conversation;
}

export interface ChatPage {
  conversation: WhatsAppConversationDTO;
  messages: WhatsAppMessageDTO[];
  hasMore: boolean;
}

/** The chat header and the latest 50 messages, or the 50 before `before`, oldest first. */
export async function loadChat(scope: Scope, id: string, before?: string): Promise<ChatPage | null> {
  const conversation = await findConversation(scope, id);
  if (!conversation) return null;

  // The conversation fixes the restaurant, so its messages are read scoped to
  // that one even when the caller asked across all of them.
  const page = await WhatsAppMessage.find({
    restaurantId: conversation.restaurantId,
    conversationId: conversation._id,
    ...(before ? { timestamp: { $lt: new Date(before) } } : {}),
  })
    .sort({ timestamp: -1 })
    .limit(PAGE + 1)
    .select({ rawPayload: 0, sender: 0, recipient: 0 })
    .lean<WhatsAppMessageDocument[]>();

  return {
    conversation: toConversationDTO(conversation),
    messages: page.slice(0, PAGE).reverse().map(toMessageDTO),
    hasMore: page.length > PAGE,
  };
}

/**
 * Unread back to zero. Returns the conversation and whether anything changed,
 * so the caller only fires a realtime event when it did.
 */
export async function clearUnread(scope: Scope, id: string): Promise<{ conversation: WhatsAppConversationDocument; changed: boolean } | null> {
  const current = await findConversation(scope, id);
  if (!current) return null;
  if (!current.unreadCount) return { conversation: current, changed: false };

  const cleared = await WhatsAppConversation.findOneAndUpdate(
    { restaurantId: current.restaurantId, _id: current._id, unreadCount: { $gt: 0 } },
    { $set: { unreadCount: 0 } },
    { returnDocument: "after" }
  ).lean<WhatsAppConversationDocument>();
  return cleared ? { conversation: cleared, changed: true } : { conversation: current, changed: false };
}
