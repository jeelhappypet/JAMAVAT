import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { Category } from "@/models/Category";
import { MenuItem, type MenuItemDocument } from "@/models/MenuItem";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { itemUpdateSchema, toMongoUpdate } from "@/lib/validation/menu";
import { getKitchenScope } from "@/lib/orders/kitchen";
import { toMenuItemDTO } from "@/lib/menu/structure";
import { deleteDishPhoto } from "@/lib/menu/photo";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/**
 * Admin edits anything. Counter and kitchen logins may only flip "sold out"
 * (`isAvailable`) — a kitchen only for items in its own categories.
 */
export async function PATCH(request: Request, { params }: Params) {
  const staff = await requireStaff(ROLES.anyStaff);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    const patch = itemUpdateSchema.parse(await request.json());

    if (staff.role !== "ADMIN") {
      const onlyAvailability = Object.keys(patch).every((key) => key === "isAvailable");
      if (!onlyAvailability) return jsonError(t("err.noAccess"), 403);
    }
    if (staff.role === "KITCHEN") {
      const item = await MenuItem.findById(id).select({ categoryId: 1 }).lean<Pick<MenuItemDocument, "categoryId">>();
      const scope = await getKitchenScope(staff);
      if (!item || !scope.categoryIds.has(String(item.categoryId))) return jsonError(t("err.noAccess"), 403);
    }
    if (patch.categoryId && !(await Category.exists({ _id: patch.categoryId }))) return jsonError(t("err.notFound"), 404);

    const updated = await MenuItem.findByIdAndUpdate(id, toMongoUpdate(patch), { returnDocument: "after" }).lean<MenuItemDocument>();
    if (!updated) return jsonError(t("err.notFound"), 404);
    await emitRealtimeEvent(REALTIME_EVENTS.MENU_UPDATED, { reason: "item-updated" });
    return NextResponse.json({ item: toMenuItemDTO(updated) });
  });
}

/** Hard delete — orders keep their own name/price snapshot, so history is unaffected. */
export async function DELETE(_request: Request, { params }: Params) {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    const deleted = await MenuItem.findByIdAndDelete(id).lean<MenuItemDocument>();
    if (!deleted) return jsonError(t("err.notFound"), 404);
    await deleteDishPhoto(deleted.imageUrl);
    await emitRealtimeEvent(REALTIME_EVENTS.MENU_UPDATED, { reason: "item-deleted" });
    return NextResponse.json({ ok: true });
  });
}
