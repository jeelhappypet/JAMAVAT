import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Order } from "@/models/Order";
import { serializeOrder, type OrderLean } from "@/lib/orders/serialize";
import { freeSeatIfNothingToPay } from "@/lib/tables";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

/**
 * Counter cancels an order (prank, wrong table, guest changed their mind).
 * If it was the guest's only order, there's nothing left to pay — their QR
 * is freed so a fake order can't block the table.
 */
export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(ROLES.counter);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.cancelFailed", async () => {
    await connectToDatabase();
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.alreadyProcessed"), 409);

    const updated = await Order.findOneAndUpdate(
      { _id: id, status: { $in: ["PENDING", "READY"] } },
      { $set: { status: "CANCELLED", cancelledAt: new Date() } },
      { returnDocument: "after" }
    ).lean<OrderLean & { seatId?: unknown; guestSessionId?: unknown }>();
    if (!updated) return jsonError(t("err.alreadyProcessed"), 409);

    const freed = updated.seatId && updated.guestSessionId ? await freeSeatIfNothingToPay(updated.seatId, updated.guestSessionId) : false;

    const dto = serializeOrder(updated);
    await Promise.all([
      emitRealtimeEvent(REALTIME_EVENTS.ORDER_CANCELLED, { id: dto.id, tokenNumber: dto.tokenNumber, businessDate: dto.businessDate }),
      updated.seatId ? emitRealtimeEvent(REALTIME_EVENTS.SEAT_UPDATED, { seatId: String(updated.seatId), freed }) : null,
      emitRealtimeEvent(REALTIME_EVENTS.ADMIN_STATS_UPDATED, { reason: "order:cancelled" }),
    ]);
    return NextResponse.json(dto);
  });
}
