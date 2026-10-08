/**
 * WhatsApp Cloud API settings, read from server-only env vars. The access
 * token never leaves this module's callers on the server: it is not in any
 * NEXT_PUBLIC_* var, API response, log line or database document.
 */

export interface WhatsAppSendConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  graphVersion: string;
  graphBaseUrl: string;
}

/** Needed to send messages. (The verify token is only needed by the webhook GET.) */
const SEND_VARS = ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"] as const;

/** Names (never values) of the missing send settings — safe to log and to show an admin. */
export function missingSendVars(): string[] {
  return SEND_VARS.filter((name) => !process.env[name]?.trim());
}

export function getSendConfig(): WhatsAppSendConfig | null {
  if (missingSendVars().length > 0) return null;
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN!.trim(),
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID!.trim(),
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID?.trim() || undefined,
    graphVersion: process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || "v26.0",
    // Only overridden by tests (a local mock of the Graph API).
    graphBaseUrl: (process.env.WHATSAPP_GRAPH_BASE_URL?.trim() || "https://graph.facebook.com").replace(/\/+$/, ""),
  };
}

export function getVerifyToken(): string | null {
  return process.env.WHATSAPP_VERIFY_TOKEN?.trim() || null;
}

/** Our number. Webhook events for any other phone_number_id (e.g. Meta's dashboard samples) are ignored. */
export function getOwnPhoneNumberId(): string | null {
  return process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || null;
}

/** Optional: the Meta app secret, to check the X-Hub-Signature-256 header on webhook POSTs. */
export function getAppSecret(): string | null {
  return process.env.WHATSAPP_APP_SECRET?.trim() || null;
}
