import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";
import { whatsappMessagesSchema } from "@/lib/validation/whatsapp";
import { getOwnPhoneNumberId } from "@/lib/whatsapp/config";
import { toConversationDTO, toMessageDTO } from "@/lib/whatsapp/store";
import { WhatsAppConversation, type WhatsAppConversationDocument } from "@/models/WhatsAppConversation";
import { WhatsAppMessage, type WhatsAppMessageDocument } from "@/models/WhatsAppMessage";

type Params = { params: Promise<{ id: string }> };

const PAGE = 50;

/** One chat: its header data and the latest 50 messages (or the 50 before `?before=`), oldest first. */
export async function GET(request: Request, { params }: Params) {
  const staff = await requireStaff(ROLES.whatsapp);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    const { before } = whatsappMessagesSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    await connectToDatabase();

    const conversation = await WhatsAppConversation.findById(id).lean<WhatsAppConversationDocument>();
    const ownNumber = getOwnPhoneNumberId();
    if (!conversation || (ownNumber && conversation.whatsappPhoneNumberId !== ownNumber)) return jsonError(t("err.notFound"), 404);

    const page = await WhatsAppMessage.find({ conversationId: conversation._id, ...(before ? { timestamp: { $lt: new Date(before) } } : {}) })
      .sort({ timestamp: -1 })
      .limit(PAGE + 1)
      .select({ rawPayload: 0, media: 0, sender: 0, recipient: 0 })
      .lean<WhatsAppMessageDocument[]>();

    return NextResponse.json({
      conversation: toConversationDTO(conversation),
      messages: page.slice(0, PAGE).reverse().map(toMessageDTO),
      hasMore: page.length > PAGE,
    });
  });
}
