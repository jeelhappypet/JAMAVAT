import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { Seat, type SeatDocument } from "@/models/Seat";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { seatUpdateSchema } from "@/lib/validation/tables";
import { loadSeatDetail, newSeatToken } from "@/lib/tables";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/** The counter's seat page: the guest holding this QR and every order of their sitting. */
export async function GET(_request: Request, { params }: Params) {
  const staff = await requireStaff(ROLES.counter);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.ordersLoad", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    const detail = await loadSeatDetail(id);
    if (!detail) return jsonError(t("err.notFound"), 404);
    return NextResponse.json(detail);
  });
}

/** Switch a QR off/on, or regenerate its secret (the printed sticker stops working). */
export async function PATCH(request: Request, { params }: Params) {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    const { isActive, regenerate } = seatUpdateSchema.parse(await request.json());
    const set: Record<string, unknown> = {};
    if (isActive !== undefined) set.isActive = isActive;
    if (regenerate) set.token = newSeatToken();
    const updated = await Seat.findByIdAndUpdate(id, { $set: set }, { returnDocument: "after" }).lean();
    if (!updated) return jsonError(t("err.notFound"), 404);
    await emitRealtimeEvent(REALTIME_EVENTS.SEAT_UPDATED, { seatId: id });
    return NextResponse.json({ ok: true });
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    const seat = await Seat.findById(id).lean<SeatDocument>();
    if (!seat) return jsonError(t("err.notFound"), 404);
    if (seat.currentSessionId) return jsonError(t("err.seatInUse"), 409);
    if ((await Seat.countDocuments({ tableId: seat.tableId })) <= 1) return jsonError(t("err.lastSeat"), 409);
    await Seat.deleteOne({ _id: id });
    await emitRealtimeEvent(REALTIME_EVENTS.SEAT_UPDATED, { seatId: id });
    return NextResponse.json({ ok: true });
  });
}
