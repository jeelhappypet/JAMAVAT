import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { Order } from "@/models/Order";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { serializeOrder, type OrderLean } from "@/lib/orders/serialize";
import { closeSeatSession } from "@/lib/tables";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

/**
 * Counter turns down a QR order (prank, wrong table…). If that was the
 * guest's only order, their hold on the QR is released too, so a fake order
 * can't block the table.
 */
export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(ROLES.counter);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.alreadyProcessed"), 409);
    const updated = await Order.findOneAndUpdate(
      { _id: id, status: "PLACED" },
      { $set: { status: "REJECTED", rejectedAt: new Date() } },
      { returnDocument: "after" }
    ).lean<OrderLean & { seatId?: unknown; guestSessionId?: unknown }>();
    if (!updated) return jsonError(t("err.alreadyProcessed"), 409);

    let freed = false;
    if (updated.guestSessionId && updated.seatId) {
      const others = await Order.countDocuments({ guestSessionId: updated.guestSessionId, status: { $ne: "REJECTED" } });
      if (others === 0) {
        await closeSeatSession(updated.seatId, updated.guestSessionId, "FREED");
        freed = true;
      }
    }

    const dto = serializeOrder(updated);
    await Promise.all([
      emitRealtimeEvent(REALTIME_EVENTS.ORDER_REJECTED, { id: dto.id, seatCode: dto.seatCode }),
      freed ? emitRealtimeEvent(REALTIME_EVENTS.SEAT_UPDATED, { seatId: String(updated.seatId) }) : null,
    ]);
    return NextResponse.json(dto);
  });
}
