import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";
import { jsonError, respond } from "@/lib/api";
import { whatsappSendSchema } from "@/lib/validation/whatsapp";
import { getSendConfig, missingSendVars } from "@/lib/whatsapp/config";
import { normalizeWaNumber } from "@/lib/whatsapp/phone";
import { sendTextMessage, type SendFailure } from "@/lib/whatsapp/graph";
import { REPLY_WINDOW_MS, saveOutboundMessage, toConversationDTO, toMessageDTO } from "@/lib/whatsapp/store";
import { emitWhatsAppEvent } from "@/lib/realtime/server";
import { WHATSAPP_EVENTS } from "@/lib/realtime/events";
import { WhatsAppConversation, type WhatsAppConversationDocument } from "@/models/WhatsAppConversation";

const FAILURES: Record<SendFailure, { key: MessageKey; status: number }> = {
  window: { key: "wa.err.windowClosed", status: 409 },
  recipient: { key: "wa.err.invalidRecipient", status: 400 },
  auth: { key: "wa.err.metaAuth", status: 502 },
  rate: { key: "wa.err.rateLimited", status: 429 },
  timeout: { key: "wa.err.timeout", status: 504 },
  other: { key: "wa.err.sendFailed", status: 502 },
};

/**
 * Staff reply. Free-form text only inside WhatsApp's 24-hour window after the
 * customer's last message — outside it Meta requires an approved template,
 * which this inbox doesn't send yet, so we refuse up front instead of
 * pretending. The message is saved only after Meta accepts it.
 */
export async function POST(request: Request) {
  const staff = await requireStaff(ROLES.whatsapp);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  const config = getSendConfig();
  if (!config) {
    console.error(JSON.stringify({ scope: "whatsapp.send", result: "not-configured", missing: missingSendVars() }));
    return jsonError(t("wa.err.notConfigured"), 503);
  }

  return respond(t, "wa.err.sendFailed", async () => {
    const { conversationId, to, message } = whatsappSendSchema.parse(await request.json());
    await connectToDatabase();

    const conversation = await WhatsAppConversation.findById(conversationId).lean<WhatsAppConversationDocument>();
    // A chat on another number (or none) is not ours to reply from.
    if (!conversation || conversation.whatsappPhoneNumberId !== config.phoneNumberId) return jsonError(t("err.notFound"), 404);

    const recipient = normalizeWaNumber(conversation.customerWaId);
    if (!recipient || (to !== undefined && normalizeWaNumber(to) !== recipient)) return jsonError(t("wa.err.invalidRecipient"), 400);

    const windowOpen = conversation.lastInboundAt && Date.now() - conversation.lastInboundAt.getTime() < REPLY_WINDOW_MS;
    if (!windowOpen) return jsonError(t("wa.err.windowClosed"), 409);

    const sent = await sendTextMessage(config, recipient, message);
    if (!sent.ok) {
      const failure = FAILURES[sent.reason];
      return jsonError(t(failure.key), failure.status);
    }

    const saved = await saveOutboundMessage({
      conversation,
      whatsappMessageId: sent.whatsappMessageId,
      text: message,
      from: config.phoneNumberId,
      staff: { id: staff.id, name: staff.name },
    });
    const payload = { conversation: toConversationDTO(saved.conversation), message: toMessageDTO(saved.message) };
    console.info(JSON.stringify({ scope: "whatsapp.send", result: "accepted", messageId: sent.whatsappMessageId, to: recipient }));
    await emitWhatsAppEvent(WHATSAPP_EVENTS.MESSAGE_SENT, payload);
    return NextResponse.json(payload, { status: 201 });
  });
}
