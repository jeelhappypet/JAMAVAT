import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";
import { clearUnread } from "@/lib/whatsapp/inbox";
import { toConversationDTO } from "@/lib/whatsapp/store";
import { emitWhatsAppEvent } from "@/lib/realtime/server";
import { WHATSAPP_EVENTS } from "@/lib/realtime/events";

type Params = { params: Promise<{ id: string }> };

/** Staff opened the chat: unread back to 0 (in Jamavat only — the customer's ticks are not changed). */
export async function POST(_request: Request, { params }: Params) {
  const staff = await requireStaff(ROLES.whatsapp);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { id } = await params;
    await connectToDatabase();
    const result = await clearUnread(staff.restaurantId, id);
    if (!result) return jsonError(t("err.notFound"), 404);
    const conversation = toConversationDTO(result.conversation);
    // Only notifies the other screens when there actually was something unread.
    if (result.changed) await emitWhatsAppEvent(staff.restaurantId, WHATSAPP_EVENTS.CONVERSATION_UPDATED, { conversation });
    return NextResponse.json({ conversation });
  });
}
