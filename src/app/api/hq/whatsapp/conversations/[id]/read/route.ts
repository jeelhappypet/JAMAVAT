import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireHq } from "@/lib/hq/guard";
import { clearUnread } from "@/lib/whatsapp/inbox";
import { toConversationDTO } from "@/lib/whatsapp/store";
import { emitWhatsAppEvent } from "@/lib/realtime/server";
import { WHATSAPP_EVENTS } from "@/lib/realtime/events";

/** HQ opened the chat. The restaurant's own screens see the unread clear too. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const hq = await requireHq();
  if (hq instanceof NextResponse) return hq;

  await connectToDatabase();
  const { id } = await params;
  const result = await clearUnread(null, id);
  if (!result) return NextResponse.json({ error: "That chat is gone" }, { status: 404 });
  const conversation = toConversationDTO(result.conversation);
  if (result.changed) await emitWhatsAppEvent(result.conversation.restaurantId, WHATSAPP_EVENTS.CONVERSATION_UPDATED, { conversation });
  return NextResponse.json({ conversation });
}
