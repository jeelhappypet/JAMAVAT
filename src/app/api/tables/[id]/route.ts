import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { Table } from "@/models/Table";
import { Seat } from "@/models/Seat";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { tableUpdateSchema } from "@/lib/validation/tables";
import { toMongoUpdate } from "@/lib/validation/menu";
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
    const { area, ...rest } = tableUpdateSchema.parse(await request.json());
    const patch = toMongoUpdate({ ...rest, ...(area !== undefined ? { area } : {}) });
    if (area === "") Object.assign(patch, { $unset: { area: 1 } });
    if (area === "" && "$set" in patch) delete (patch.$set as Record<string, unknown>).area;
    const updated = await Table.findByIdAndUpdate(id, patch, { returnDocument: "after" }).lean();
    if (!updated) return jsonError(t("err.notFound"), 404);
    await emitRealtimeEvent(REALTIME_EVENTS.SEAT_UPDATED, { tableId: id });
    return NextResponse.json({ ok: true });
  });
}

/** Deletes a table and its QRs — refused while a guest holds any of them. */
export async function DELETE(_request: Request, { params }: Params) {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    if (await Seat.exists({ tableId: id, currentSessionId: { $ne: null } })) return jsonError(t("err.seatInUse"), 409);
    const deleted = await Table.findByIdAndDelete(id).lean();
    if (!deleted) return jsonError(t("err.notFound"), 404);
    await Seat.deleteMany({ tableId: id });
    await emitRealtimeEvent(REALTIME_EVENTS.SEAT_UPDATED, { tableId: id });
    return NextResponse.json({ ok: true });
  });
}
