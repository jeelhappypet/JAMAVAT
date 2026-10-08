import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { Seat, type SeatDocument } from "@/models/Seat";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { closeSeatSession } from "@/lib/tables";
import { emitRealtimeEvent, notifyGuestSeat } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

/** Counter releases a QR held by a guest who left (or lost their phone). Their orders stay as they are. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(ROLES.counter);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    const seat = await Seat.findById(id).lean<SeatDocument>();
    if (!seat) return jsonError(t("err.notFound"), 404);
    if (seat.currentSessionId) await closeSeatSession(seat._id, seat.currentSessionId, "FREED");
    await Promise.all([emitRealtimeEvent(REALTIME_EVENTS.SEAT_UPDATED, { seatId: id }), notifyGuestSeat(seat._id)]);
    return NextResponse.json({ ok: true });
  });
}
