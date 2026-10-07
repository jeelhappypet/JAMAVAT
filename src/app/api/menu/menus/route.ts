import { NextResponse } from "next/server";
import { Menu } from "@/models/Menu";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { menuCreateSchema } from "@/lib/validation/menu";
import { ensureMenuStructure } from "@/lib/menu/structure";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { getTranslator } from "@/lib/i18n/server";
import { respond } from "@/lib/api";

export async function POST(request: Request) {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { name, nameGu } = menuCreateSchema.parse(await request.json());
    await ensureMenuStructure();
    const last = await Menu.findOne().sort({ sortOrder: -1 }).select({ sortOrder: 1 }).lean<{ sortOrder?: number }>();
    const menu = await Menu.create({ name, nameGu: nameGu || undefined, sortOrder: (last?.sortOrder ?? -1) + 1 });
    await emitRealtimeEvent(REALTIME_EVENTS.MENU_UPDATED, { reason: "menu-created" });
    return NextResponse.json({ id: String(menu._id) }, { status: 201 });
  });
}
