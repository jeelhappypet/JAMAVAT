import type { WhatsAppSendConfig } from "./config";

/**
 * Calls the WhatsApp Cloud API from the server. The bearer token is only put
 * in the request header here — never logged, never returned. Meta's error is
 * reduced to a small category the route turns into a translated message.
 */

export type SendFailure =
  /** Outside the 24-hour customer-service window — needs an approved template (131047). */
  | "window"
  /** The number isn't on WhatsApp or isn't valid (131026, 131030, 100 on `to`). */
  | "recipient"
  /** Token expired/revoked or missing permission (190, 10, 200, 131005). */
  | "auth"
  /** Too many messages (4, 80007, 130429, 131056). */
  | "rate"
  /** The template is missing, paused for poor quality, or the parameters don't match it (132xxx). */
  | "template"
  | "timeout"
  | "other";

export type SendResult = { ok: true; whatsappMessageId: string } | { ok: false; reason: SendFailure; code?: number };

const TIMEOUT_MS = 15000;

function categorise(code: number | undefined, subcode: number | undefined, httpStatus: number): SendFailure {
  if (code === 131047) return "window";
  if (code === 131026 || code === 131030 || code === 131009) return "recipient";
  // 100/33: the token can't see this phone number or account (granted for another WABA).
  if (code === 190 || code === 10 || code === 200 || code === 131005 || httpStatus === 401 || (code === 100 && subcode === 33)) return "auth";
  if (code === 4 || code === 80007 || code === 130429 || code === 131056 || httpStatus === 429) return "rate";
  // 132000-132016: template missing, parameters that don't match it, or one
  // Meta has paused or disabled because its quality rating fell.
  if (code !== undefined && code >= 132000 && code <= 132099) return "template";
  return "other";
}

/** One POST to /messages. Every send shape goes through here so the logging and the error mapping stay in one place. */
async function post(config: WhatsAppSendConfig, to: string, payload: Record<string, unknown>): Promise<SendResult> {
  const url = `${config.graphBaseUrl}/${config.graphVersion}/${encodeURIComponent(config.phoneNumberId)}/messages`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, ...payload }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    console.error(JSON.stringify({ scope: "whatsapp.send", result: timedOut ? "timeout" : "network-error", to }));
    return { ok: false, reason: timedOut ? "timeout" : "other" };
  }

  const data = (await response.json().catch(() => null)) as {
    messages?: { id?: string }[];
    error?: { code?: number; error_subcode?: number; type?: string; message?: string; fbtrace_id?: string };
  } | null;

  const id = data?.messages?.[0]?.id;
  if (response.ok && id) return { ok: true, whatsappMessageId: id };

  const code = data?.error?.code;
  // Meta's error text can name the request but never contains our token; still keep the log small.
  console.error(
    JSON.stringify({
      scope: "whatsapp.send",
      result: "rejected",
      httpStatus: response.status,
      code,
      subcode: data?.error?.error_subcode,
      type: data?.error?.type,
      message: data?.error?.message?.slice(0, 200),
      fbtrace: data?.error?.fbtrace_id,
      to,
    })
  );
  return { ok: false, reason: categorise(code, data?.error?.error_subcode, response.status), code };
}

export async function sendTextMessage(config: WhatsAppSendConfig, to: string, body: string): Promise<SendResult> {
  return post(config, to, { type: "text", text: { preview_url: false, body } });
}

/**
 * An approved template — the only thing Meta lets you send to someone who has
 * never messaged you, so it is what the outreach bot uses for a first contact.
 *
 * `params` fill the template's {{1}}, {{2}}… in order, and must match the
 * approved text exactly or Meta rejects the send with a 132xxx. A template
 * whose quality rating falls gets paused by Meta, which arrives here as the
 * same "template" failure.
 */
export async function sendTemplateMessage(
  config: WhatsAppSendConfig,
  to: string,
  template: { name: string; language: string; params: string[] }
): Promise<SendResult> {
  return post(config, to, {
    type: "template",
    template: {
      name: template.name,
      language: { code: template.language },
      ...(template.params.length
        ? { components: [{ type: "body", parameters: template.params.map((text) => ({ type: "text", text })) }] }
        : {}),
    },
  });
}

/** An image already uploaded to Meta, sent by its media id. */
export async function sendImageMessage(config: WhatsAppSendConfig, to: string, mediaId: string, caption?: string): Promise<SendResult> {
  return post(config, to, { type: "image", image: { id: mediaId, ...(caption ? { caption } : {}) } });
}

export type UploadResult = { ok: true; mediaId: string } | { ok: false; error: string };

/**
 * Puts a file on Meta's media store and returns its id, which a message then
 * references. Meta keeps it for 30 days, which is longer than any chat needs.
 */
export async function uploadMedia(config: WhatsAppSendConfig, file: Blob, filename: string): Promise<UploadResult> {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("file", file, filename);
  try {
    const response = await fetch(`${config.graphBaseUrl}/${config.graphVersion}/${encodeURIComponent(config.phoneNumberId)}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.accessToken}` },
      body: form,
      signal: AbortSignal.timeout(60000),
      cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as { id?: string; error?: { message?: string } } | null;
    if (response.ok && data?.id) return { ok: true, mediaId: data.id };
    console.error(JSON.stringify({ scope: "whatsapp.upload", httpStatus: response.status, message: data?.error?.message?.slice(0, 200) }));
    return { ok: false, error: data?.error?.message?.slice(0, 200) || "Upload failed" };
  } catch (error) {
    return { ok: false, error: error instanceof Error && error.name === "TimeoutError" ? "Upload timed out" : "Upload failed" };
  }
}

export interface TemplateSummary {
  name: string;
  language: string;
  status: string;
  category?: string;
  /** The body as approved, with its {{1}}… placeholders still in it. */
  body: string;
  /** How many placeholders the body has, so the sender can be asked for them. */
  params: number;
}

/** The templates on a WhatsApp Business Account, approved ones first. */
export async function listTemplates(config: WhatsAppSendConfig, wabaId: string): Promise<TemplateSummary[]> {
  const result = await graphRequest(config, `${wabaId}/message_templates?fields=name,status,language,category,components&limit=100`);
  if (!result.ok) return [];
  const data = result.data as { data?: { name: string; status: string; language: string; category?: string; components?: { type: string; text?: string }[] }[] };
  return (data.data ?? [])
    .map((one) => {
      const body = one.components?.find((part) => part.type === "BODY")?.text ?? "";
      return { name: one.name, language: one.language, status: one.status, category: one.category, body, params: new Set(body.match(/\{\{\d+\}\}/g) ?? []).size };
    })
    .sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === "APPROVED" ? -1 : 1));
}

export type GraphReadResult = { ok: true; data: unknown } | { ok: false; status: number; error: { code?: number; subcode?: number; type?: string; message?: string } };

/** Server-side Graph call for the admin connection check. Returns Meta's data or its error — never the token. */
export async function graphRequest(config: WhatsAppSendConfig, path: string, method: "GET" | "POST" = "GET"): Promise<GraphReadResult> {
  try {
    const response = await fetch(`${config.graphBaseUrl}/${config.graphVersion}/${path}`, {
      method,
      headers: { Authorization: `Bearer ${config.accessToken}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    const data = (await response.json().catch(() => null)) as { error?: { code?: number; error_subcode?: number; type?: string; message?: string } } | null;
    if (response.ok && !data?.error) return { ok: true, data };
    const error = data?.error;
    return { ok: false, status: response.status, error: { code: error?.code, subcode: error?.error_subcode, type: error?.type, message: error?.message?.slice(0, 300) } };
  } catch (error) {
    return { ok: false, status: 0, error: { message: error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network error" } };
  }
}
