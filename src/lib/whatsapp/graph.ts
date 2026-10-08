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
  | "timeout"
  | "other";

export type SendResult = { ok: true; whatsappMessageId: string } | { ok: false; reason: SendFailure; code?: number };

const TIMEOUT_MS = 15000;

function categorise(code: number | undefined, httpStatus: number): SendFailure {
  if (code === 131047) return "window";
  if (code === 131026 || code === 131030 || code === 131009) return "recipient";
  if (code === 190 || code === 10 || code === 200 || code === 131005 || httpStatus === 401) return "auth";
  if (code === 4 || code === 80007 || code === 130429 || code === 131056 || httpStatus === 429) return "rate";
  return "other";
}

export async function sendTextMessage(config: WhatsAppSendConfig, to: string, body: string): Promise<SendResult> {
  const url = `${config.graphBaseUrl}/${config.graphVersion}/${encodeURIComponent(config.phoneNumberId)}/messages`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body } }),
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
  return { ok: false, reason: categorise(code, response.status), code };
}
