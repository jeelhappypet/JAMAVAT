import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireHq } from "@/lib/hq/guard";
import { findConversation } from "@/lib/whatsapp/inbox";
import { getSendConfig } from "@/lib/whatsapp/config";
import { normalizeWaNumber } from "@/lib/whatsapp/phone";
import { sendImageMessage, sendTemplateMessage, sendTextMessage, type SendFailure, type SendResult } from "@/lib/whatsapp/graph";
import { REPLY_WINDOW_MS, saveOutboundMessage, toConversationDTO, toMessageDTO } from "@/lib/whatsapp/store";
import { emitWhatsAppEvent } from "@/lib/realtime/server";
import { WHATSAPP_EVENTS } from "@/lib/realtime/events";

/**
 * HQ replying in any restaurant's chat: plain text, an image, or an approved
 * template.
 *
 * Only the template works outside WhatsApp's 24-hour window — that is the
 * whole reason the picker exists. Text and images are refused there rather
 * than sent and silently dropped by Meta.
 *
 * The reply is attributed to HQ, not to a staff member, so the restaurant's
 * own inbox shows who actually answered their customer.
 */
const sendSchema = z.union([
  z.object({ conversationId: z.string(), kind: z.literal("text"), message: z.string().trim().min(1).max(4096) }),
  z.object({ conversationId: z.string(), kind: z.literal("image"), mediaId: z.string().min(1), caption: z.string().trim().max(1024).optional() }),
  z.object({
    conversationId: z.string(),
    kind: z.literal("template"),
    name: z.string().min(1),
    language: z.string().min(2),
    params: z.array(z.string().max(500)).max(20).default([]),
    /** What the chat should show: the body with its placeholders filled in. */
    preview: z.string().min(1).max(4096),
  }),
]);

const FAILURES: Record<SendFailure, { message: string; status: number }> = {
  window: { message: "The 24-hour reply window has closed. Send an approved template instead.", status: 409 },
  recipient: { message: "That WhatsApp number isn't valid.", status: 400 },
  auth: { message: "WhatsApp refused our access. Check the token and permissions in Meta.", status: 502 },
  rate: { message: "WhatsApp is limiting messages right now. Try again in a minute.", status: 429 },
  template: { message: "WhatsApp refused the template. Check it is approved and that the placeholders match.", status: 502 },
  sample: { message: "That is one of Meta's demo templates — it only works from their test number, never from yours. Use one of your own approved templates.", status: 400 },
  timeout: { message: "WhatsApp didn't answer in time. Check the chat before sending again.", status: 504 },
  other: { message: "The message couldn't be sent.", status: 502 },
};

export async function POST(request: Request) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;

  const config = getSendConfig();
  if (!config) return NextResponse.json({ error: "WhatsApp sending isn't set up on the server." }, { status: 503 });

  const parsed = sendSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nothing to send" }, { status: 400 });
  const body = parsed.data;

  await connectToDatabase();
  const conversation = await findConversation(null, body.conversationId);
  if (!conversation || conversation.whatsappPhoneNumberId !== config.phoneNumberId) {
    return NextResponse.json({ error: "That chat is gone" }, { status: 404 });
  }

  const recipient = normalizeWaNumber(conversation.customerWaId);
  if (!recipient) return NextResponse.json({ error: FAILURES.recipient.message }, { status: 400 });

  const windowOpen = Boolean(conversation.lastInboundAt && Date.now() - conversation.lastInboundAt.getTime() < REPLY_WINDOW_MS);
  if (!windowOpen && body.kind !== "template") return NextResponse.json({ error: FAILURES.window.message }, { status: 409 });

  let sent: SendResult;
  let shown: string;
  if (body.kind === "text") {
    shown = body.message;
    sent = await sendTextMessage(config, recipient, body.message);
  } else if (body.kind === "image") {
    shown = body.caption || "📷 Photo";
    sent = await sendImageMessage(config, recipient, body.mediaId, body.caption);
  } else {
    shown = body.preview;
    sent = await sendTemplateMessage(config, recipient, { name: body.name, language: body.language, params: body.params });
  }

  if (!sent.ok) {
    const failure = FAILURES[sent.reason];
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }

  // Past this line WhatsApp has the message and the customer will see it, so
  // nothing below may answer "couldn't be sent". A failure to file our own
  // copy is our problem to log, not a lie to tell the person who sent it.
  console.info(JSON.stringify({ scope: "whatsapp.send", by: "hq", kind: body.kind, result: "accepted", messageId: sent.whatsappMessageId, to: recipient }));
  try {
    const saved = await saveOutboundMessage({
      restaurantId: conversation.restaurantId,
      conversation,
      whatsappMessageId: sent.whatsappMessageId,
      text: shown,
      from: config.phoneNumberId,
      // HQ is not a Staff document, so it sends a name and no id.
      staff: { name: "Jamavat HQ" },
      messageType: body.kind === "text" ? "text" : body.kind === "image" ? "image" : "template",
      ...(body.kind === "image" ? { media: { id: body.mediaId } } : {}),
    });
    const payload = { conversation: toConversationDTO(saved.conversation), message: toMessageDTO(saved.message) };
    await emitWhatsAppEvent(conversation.restaurantId, WHATSAPP_EVENTS.MESSAGE_SENT, payload);
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    console.error(JSON.stringify({ scope: "whatsapp.send", by: "hq", result: "sent-but-not-saved", messageId: sent.whatsappMessageId, error: error instanceof Error ? error.message : "unknown" }));
    return NextResponse.json({ delivered: true, warning: "Sent on WhatsApp, but Jamavat couldn't file its copy. It will appear after the next refresh." }, { status: 202 });
  }
}
