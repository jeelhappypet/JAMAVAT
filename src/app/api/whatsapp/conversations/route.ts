import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getTranslator } from "@/lib/i18n/server";
import { respond } from "@/lib/api";
import { whatsappListSchema } from "@/lib/validation/whatsapp";
import { getOwnPhoneNumberId } from "@/lib/whatsapp/config";
import { toConversationDTO } from "@/lib/whatsapp/store";
import { WhatsAppConversation, type WhatsAppConversationDocument } from "@/models/WhatsAppConversation";

const LIMIT = 100;
const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Inbox list, newest first. `?q=` searches name and number. */
export async function GET(request: Request) {
  const staff = await requireStaff(ROLES.whatsapp);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    const { q } = whatsappListSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    await connectToDatabase();

    const filter: Record<string, unknown> = {};
    const ownNumber = getOwnPhoneNumberId();
    if (ownNumber) filter.whatsappPhoneNumberId = ownNumber;
    if (q) {
      const pattern = new RegExp(escapeRegex(q), "i");
      const digits = q.replace(/\D/g, "");
      filter.$or = [{ customerName: pattern }, ...(digits.length >= 3 ? [{ customerWaId: new RegExp(escapeRegex(digits)) }] : [])];
    }

    const conversations = await WhatsAppConversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .limit(LIMIT)
      .select({ customerId: 1, customerName: 1, customerWaId: 1, status: 1, lastMessage: 1, lastMessageDirection: 1, lastMessageAt: 1, lastInboundAt: 1, unreadCount: 1 })
      .lean<WhatsAppConversationDocument[]>();
    return NextResponse.json({ conversations: conversations.map(toConversationDTO) });
  });
}
