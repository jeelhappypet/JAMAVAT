import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeWaNumber } from "./phone";

/**
 * Pure parsing of Meta's webhook body (no DB, no network) so it can be unit
 * tested. Anything malformed is skipped, never thrown — one bad entry must
 * not make Meta retry the whole batch.
 */

export interface InboundMessage {
  whatsappMessageId: string;
  waId: string;
  profileName?: string;
  timestamp: Date;
  messageType: string;
  /** The text, a media caption, or a short label like "[image]" for the inbox. */
  text: string;
  media?: { id: string; mimeType?: string };
  phoneNumberId: string;
  displayPhoneNumber?: string;
  wabaId?: string;
  /** Meta's own object for this one message (not the whole webhook). */
  raw: Record<string, unknown>;
}

export interface StatusUpdate {
  whatsappMessageId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: Date;
  recipientWaId?: string;
  phoneNumberId: string;
  error?: { code?: number; title?: string; message?: string };
}

export interface ParsedWebhook {
  messages: InboundMessage[];
  statuses: StatusUpdate[];
  /** Changes we don't handle (other fields), counted for the log. */
  skipped: number;
}

type Obj = Record<string, unknown>;
const isObj = (value: unknown): value is Obj => typeof value === "object" && value !== null && !Array.isArray(value);
const str = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : undefined);
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const STATUS_VALUES = new Set(["sent", "delivered", "read", "failed"]);
/** Longest inbox text we keep — WhatsApp's own text limit. */
const MAX_TEXT = 4096;

function toDate(seconds: unknown): Date {
  const value = Number(seconds);
  return Number.isFinite(value) && value > 0 ? new Date(value * 1000) : new Date();
}

/** What the inbox shows for a message, by type. */
function describe(message: Obj, type: string): { text: string; media?: InboundMessage["media"] } {
  const part = isObj(message[type]) ? (message[type] as Obj) : {};
  switch (type) {
    case "text":
      return { text: str(part.body) ?? "" };
    case "image":
    case "video":
    case "document":
    case "audio":
    case "sticker": {
      const id = str(part.id);
      const caption = str(part.caption) ?? (type === "document" ? str(part.filename) : undefined);
      return { text: caption ?? `[${type}]`, media: id ? { id, mimeType: str(part.mime_type) } : undefined };
    }
    case "location": {
      const name = str(part.name) ?? str(part.address);
      return { text: name ? `[location] ${name}` : `[location] ${part.latitude ?? "?"}, ${part.longitude ?? "?"}` };
    }
    case "reaction":
      return { text: str(part.emoji) ? `[reaction] ${str(part.emoji)}` : "[reaction removed]" };
    case "button":
      return { text: str(part.text) ?? "[button]" };
    case "interactive": {
      const reply = isObj(part.button_reply) ? part.button_reply : isObj(part.list_reply) ? part.list_reply : {};
      return { text: str((reply as Obj).title) ?? "[interactive]" };
    }
    case "contacts":
      return { text: "[contact card]" };
    default:
      return { text: `[${type || "unsupported"}]` };
  }
}

export function parseWebhook(body: unknown): ParsedWebhook {
  const result: ParsedWebhook = { messages: [], statuses: [], skipped: 0 };
  if (!isObj(body) || body.object !== "whatsapp_business_account") return result;

  for (const entry of list(body.entry)) {
    if (!isObj(entry)) continue;
    const wabaId = str(entry.id);
    for (const change of list(entry.changes)) {
      if (!isObj(change) || change.field !== "messages" || !isObj(change.value)) {
        result.skipped += 1;
        continue;
      }
      const value = change.value;
      const metadata = isObj(value.metadata) ? value.metadata : {};
      const phoneNumberId = str(metadata.phone_number_id);
      if (!phoneNumberId) {
        result.skipped += 1;
        continue;
      }

      const names = new Map<string, string>();
      for (const contact of list(value.contacts)) {
        if (!isObj(contact)) continue;
        const waId = normalizeWaNumber(contact.wa_id);
        const name = isObj(contact.profile) ? str(contact.profile.name) : undefined;
        if (waId && name) names.set(waId, name);
      }

      for (const message of list(value.messages)) {
        if (!isObj(message)) continue;
        const whatsappMessageId = str(message.id);
        const waId = normalizeWaNumber(message.from);
        if (!whatsappMessageId || !waId) continue;
        const messageType = str(message.type) ?? "unsupported";
        const { text, media } = describe(message, messageType);
        result.messages.push({
          whatsappMessageId,
          waId,
          profileName: names.get(waId),
          timestamp: toDate(message.timestamp),
          messageType,
          text: text.slice(0, MAX_TEXT),
          media,
          phoneNumberId,
          displayPhoneNumber: str(metadata.display_phone_number),
          wabaId,
          raw: message,
        });
      }

      for (const status of list(value.statuses)) {
        if (!isObj(status)) continue;
        const whatsappMessageId = str(status.id);
        const state = str(status.status);
        if (!whatsappMessageId || !state || !STATUS_VALUES.has(state)) continue;
        const first = list(status.errors).find(isObj);
        const details = first && isObj(first.error_data) ? str(first.error_data.details) : undefined;
        result.statuses.push({
          whatsappMessageId,
          status: state as StatusUpdate["status"],
          timestamp: toDate(status.timestamp),
          recipientWaId: normalizeWaNumber(status.recipient_id) ?? undefined,
          phoneNumberId,
          error: first
            ? {
                code: typeof first.code === "number" ? first.code : undefined,
                title: str(first.title)?.slice(0, 200),
                message: (details ?? str(first.message))?.slice(0, 500),
              }
            : undefined,
        });
      }
    }
  }
  return result;
}

/**
 * Checks Meta's X-Hub-Signature-256 header (HMAC-SHA256 of the raw body with
 * the app secret). Constant-time compare.
 */
export function isValidSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex"), "utf8");
  const given = Buffer.from(header.slice("sha256=".length), "utf8");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
