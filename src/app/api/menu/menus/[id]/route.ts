import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { Menu } from "@/models/Menu";
import { Category } from "@/models/Category";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { menuUpdateSchema, toMongoUpdate } from "@/lib/validation/menu";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    const patch = menuUpdateSchema.parse(await request.json());
    const updated = await Menu.findByIdAndUpdate(id, toMongoUpdate(patch), { returnDocument: "after" }).lean();
    if (!updated) return jsonError(t("err.notFound"), 404);
    await emitRealtimeEvent(REALTIME_EVENTS.MENU_UPDATED, { reason: "menu-updated" });
    return NextResponse.json({ ok: true });
  });
}

/** Only an empty menu can be deleted — categories (and their items) must be moved or deleted first. */
export async function DELETE(_request: Request, { params }: Params) {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    if (await Category.exists({ menuId: id })) return jsonError(t("err.menuNotEmpty"), 409);
    const deleted = await Menu.findByIdAndDelete(id).lean();
    if (!deleted) return jsonError(t("err.notFound"), 404);
    await emitRealtimeEvent(REALTIME_EVENTS.MENU_UPDATED, { reason: "menu-deleted" });
    return NextResponse.json({ ok: true });
  });
}
