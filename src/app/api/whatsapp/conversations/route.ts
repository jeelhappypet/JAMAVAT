import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getTranslator } from "@/lib/i18n/server";
import { respond } from "@/lib/api";
import { whatsappListSchema } from "@/lib/validation/whatsapp";
import { listConversations } from "@/lib/whatsapp/inbox";

/** Inbox list, newest first. `?q=` searches name and number. */
export async function GET(request: Request) {
  const staff = await requireStaff(ROLES.whatsapp);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.server", async () => {
    const { q } = whatsappListSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    await connectToDatabase();
    return NextResponse.json({ conversations: await listConversations(staff.restaurantId, q) });
  });
}
