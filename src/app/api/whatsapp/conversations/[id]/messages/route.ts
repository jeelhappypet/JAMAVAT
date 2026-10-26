import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";
import { whatsappMessagesSchema } from "@/lib/validation/whatsapp";
import { loadChat } from "@/lib/whatsapp/inbox";

type Params = { params: Promise<{ id: string }> };

/** One chat: its header data and the latest 50 messages (or the 50 before `?before=`), oldest first. */
export async function GET(request: Request, { params }: Params) {
  const staff = await requireStaff(ROLES.whatsapp);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    const { id } = await params;
    const { before } = whatsappMessagesSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    await connectToDatabase();
    const chat = await loadChat(staff.restaurantId, id, before);
    return chat ? NextResponse.json(chat) : jsonError(t("err.notFound"), 404);
  });
}
