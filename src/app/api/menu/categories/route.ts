import { NextResponse } from "next/server";
import { Menu } from "@/models/Menu";
import { Category } from "@/models/Category";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { categoryCreateSchema } from "@/lib/validation/menu";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

export async function POST(request: Request) {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { menuId, name, nameGu } = categoryCreateSchema.parse(await request.json());
    if (!(await Menu.exists({ _id: menuId }))) return jsonError(t("err.notFound"), 404);
    const last = await Category.findOne({ menuId }).sort({ sortOrder: -1 }).select({ sortOrder: 1 }).lean<{ sortOrder?: number }>();
    const category = await Category.create({ menuId, name, nameGu: nameGu || undefined, sortOrder: (last?.sortOrder ?? -1) + 1 });
    await emitRealtimeEvent(REALTIME_EVENTS.MENU_UPDATED, { reason: "category-created" });
    return NextResponse.json({ id: String(category._id) }, { status: 201 });
  });
}
