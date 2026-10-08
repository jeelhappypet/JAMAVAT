import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { MenuItem, type MenuItemDocument } from "@/models/MenuItem";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { PHOTO_MAX_BYTES, PHOTO_TYPES, deleteDishPhoto, photoStorageReady, storeDishPhoto } from "@/lib/menu/photo";
import { toMenuItemDTO } from "@/lib/menu/structure";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/** Admin: replace the dish photo. Body is multipart with one `photo` file. */
export async function POST(request: Request, { params }: Params) {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();
  if (!photoStorageReady()) return jsonError(t("err.photoStorageOff"), 503);

  return respond(t, "err.photoFailed", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);

    const form = await request.formData().catch(() => null);
    const file = form?.get("photo");
    if (!(file instanceof Blob)) return jsonError(t("err.photoType"), 400);
    const type = PHOTO_TYPES.find((allowed) => allowed === file.type);
    if (!type) return jsonError(t("err.photoType"), 400);
    if (file.size > PHOTO_MAX_BYTES) return jsonError(t("err.photoTooBig"), 413);

    const before = await MenuItem.findById(id).select({ imageUrl: 1 }).lean<Pick<MenuItemDocument, "imageUrl">>();
    if (!before) return jsonError(t("err.notFound"), 404);

    const imageUrl = await storeDishPhoto(id, file, type);
    const updated = await MenuItem.findByIdAndUpdate(id, { $set: { imageUrl } }, { returnDocument: "after" }).lean<MenuItemDocument>();
    if (!updated) {
      // Deleted while uploading — don't keep an orphan.
      await deleteDishPhoto(imageUrl);
      return jsonError(t("err.notFound"), 404);
    }
    await deleteDishPhoto(before.imageUrl);
    await emitRealtimeEvent(REALTIME_EVENTS.MENU_UPDATED, { reason: "item-updated" });
    return NextResponse.json({ item: toMenuItemDTO(updated) });
  });
}

/** Admin: remove the dish photo. */
export async function DELETE(_request: Request, { params }: Params) {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    const before = await MenuItem.findByIdAndUpdate(id, { $unset: { imageUrl: 1 } }).lean<MenuItemDocument>();
    if (!before) return jsonError(t("err.notFound"), 404);
    await deleteDishPhoto(before.imageUrl);
    await emitRealtimeEvent(REALTIME_EVENTS.MENU_UPDATED, { reason: "item-updated" });
    return NextResponse.json({ ok: true });
  });
}
