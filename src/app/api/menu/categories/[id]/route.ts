import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { Menu } from "@/models/Menu";
import { Category } from "@/models/Category";
import { MenuItem } from "@/models/MenuItem";
import { Staff } from "@/models/Staff";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { categoryUpdateSchema, toMongoUpdate } from "@/lib/validation/menu";
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
    const patch = categoryUpdateSchema.parse(await request.json());
    if (patch.menuId && !(await Menu.exists({ _id: patch.menuId }))) return jsonError(t("err.notFound"), 404);
    const updated = await Category.findByIdAndUpdate(id, toMongoUpdate(patch), { returnDocument: "after" }).lean();
    if (!updated) return jsonError(t("err.notFound"), 404);
    await emitRealtimeEvent(REALTIME_EVENTS.MENU_UPDATED, { reason: "category-updated" });
    return NextResponse.json({ ok: true });
  });
}

/** Only an empty category can be deleted; it's also removed from every kitchen's routing. */
export async function DELETE(_request: Request, { params }: Params) {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    if (await MenuItem.exists({ categoryId: id })) return jsonError(t("err.categoryNotEmpty"), 409);
    const deleted = await Category.findByIdAndDelete(id).lean();
    if (!deleted) return jsonError(t("err.notFound"), 404);
    await Staff.updateMany({ categoryIds: id }, { $pull: { categoryIds: id } });
    await emitRealtimeEvent(REALTIME_EVENTS.MENU_UPDATED, { reason: "category-deleted" });
    return NextResponse.json({ ok: true });
  });
}
