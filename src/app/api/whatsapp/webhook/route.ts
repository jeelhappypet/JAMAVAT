import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getAppSecret, getOwnPhoneNumberId, getVerifyToken } from "@/lib/whatsapp/config";
import { isValidSignature, parseWebhook } from "@/lib/whatsapp/webhook";
import { applyStatus, saveInboundMessage, toConversationDTO, toMessageDTO } from "@/lib/whatsapp/store";
import { emitWhatsAppEvent } from "@/lib/realtime/server";
import { restaurantIdForPhoneNumber } from "@/lib/whatsapp/restaurant";
import { WHATSAPP_EVENTS } from "@/lib/realtime/events";

const log = (fields: Record<string, unknown>) => console.info(JSON.stringify({ scope: "whatsapp.webhook", ...fields }));

/** Meta's webhook verification: echo hub.challenge when the verify token matches. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const verifyToken = getVerifyToken();

  if (!verifyToken) log({ event: "verify", result: "WHATSAPP_VERIFY_TOKEN missing" });
  if (verifyToken && mode === "subscribe" && token === verifyToken) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Incoming messages and delivery statuses. Everything is saved before we
 * answer (a Vercel function may be frozen right after responding); a 200
 * tells Meta not to retry. Only a database failure answers 500, so Meta
 * retries later — the wamid unique index makes that retry harmless.
 */
export async function POST(request: Request) {
  const raw = await request.text();

  const appSecret = getAppSecret();
  if (appSecret && !isValidSignature(raw, request.headers.get("x-hub-signature-256"), appSecret)) {
    log({ event: "received", result: "bad-signature" });
    return new Response("Invalid signature", { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    log({ event: "received", result: "invalid-json" });
    return new Response("Bad Request", { status: 400 });
  }

  const parsed = parseWebhook(body);
  const ownNumber = getOwnPhoneNumberId();
  // A number nobody owns (Meta's dashboard samples, another business) has no
  // restaurant to file the chat under, so it's ignored.
  const restaurantOf = async (phoneNumberId: string) =>
    !ownNumber || phoneNumberId === ownNumber ? await restaurantIdForPhoneNumber(phoneNumberId) : null;
  log({ event: "received", messages: parsed.messages.length, statuses: parsed.statuses.length, skipped: parsed.skipped });
  if (parsed.messages.length === 0 && parsed.statuses.length === 0) return new Response("EVENT_RECEIVED", { status: 200 });

  try {
    await connectToDatabase();

    for (const inbound of parsed.messages) {
      const restaurantId = await restaurantOf(inbound.phoneNumberId);
      if (!restaurantId) {
        // e.g. the sample payload from Meta's dashboard "Test" button (dummy phone_number_id).
        log({ event: "message", messageId: inbound.whatsappMessageId, from: inbound.waId, phoneNumberId: inbound.phoneNumberId, result: "ignored-other-number" });
        continue;
      }
      const result = await saveInboundMessage(restaurantId, inbound);
      log({ event: "message", type: inbound.messageType, messageId: inbound.whatsappMessageId, from: inbound.waId, result: result.kind });
      if (result.kind === "saved") {
        await emitWhatsAppEvent(restaurantId, WHATSAPP_EVENTS.MESSAGE_NEW, {
          conversation: toConversationDTO(result.conversation),
          message: toMessageDTO(result.message),
        });
      }
    }

    for (const update of parsed.statuses) {
      const restaurantId = await restaurantOf(update.phoneNumberId);
      if (!restaurantId) continue;
      let result = await applyStatus(restaurantId, update);
      // Meta can report "sent" a moment before the send route has saved the message.
      if (result.kind === "unknown") {
        await sleep(1500);
        result = await applyStatus(restaurantId, update);
      }
      log({ event: "status", status: update.status, messageId: update.whatsappMessageId, errorCode: update.error?.code, result: result.kind });
      if (result.kind === "updated") {
        const message = toMessageDTO(result.message);
        await emitWhatsAppEvent(restaurantId, WHATSAPP_EVENTS.MESSAGE_STATUS, {
          conversationId: message.conversationId,
          messageId: message.id,
          status: message.status,
          error: message.error,
        });
      }
    }
  } catch (error) {
    log({ event: "processing", result: "error", error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}
