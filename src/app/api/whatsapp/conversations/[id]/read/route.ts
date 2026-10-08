import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";
import { getOwnPhoneNumberId } from "@/lib/whatsapp/config";
import { toConversationDTO } from "@/lib/whatsapp/store";
import { emitWhatsAppEvent } from "@/lib/realtime/server";
import { WHATSAPP_EVENTS } from "@/lib/realtime/events";
import { WhatsAppConversation, type WhatsAppConversationDocument } from "@/models/WhatsAppConversation";

type Params = { params: Promise<{ id: string }> };

/** Staff opened the chat: unread back to 0 (in Jamavat only — the customer's ticks are not changed). */
export async function POST(_request: Request, { params }: Params) {
  const staff = await requireStaff(ROLES.whatsapp);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    await connectToDatabase();
    const ownNumber = getOwnPhoneNumberId();
    const filter = { _id: id, ...(ownNumber ? { whatsappPhoneNumberId: ownNumber } : {}) };

    // Only writes (and notifies other screens) when there was something unread.
    const cleared = await WhatsAppConversation.findOneAndUpdate({ ...filter, unreadCount: { $gt: 0 } }, { $set: { unreadCount: 0 } }, { returnDocument: "after" }).lean<WhatsAppConversationDocument>();
    if (cleared) {
      const conversation = toConversationDTO(cleared);
      await emitWhatsAppEvent(WHATSAPP_EVENTS.CONVERSATION_UPDATED, { conversation });
      return NextResponse.json({ conversation });
    }
    const current = await WhatsAppConversation.findOne(filter).lean<WhatsAppConversationDocument>();
    if (!current) return jsonError(t("err.notFound"), 404);
    return NextResponse.json({ conversation: toConversationDTO(current) });
  });
}
