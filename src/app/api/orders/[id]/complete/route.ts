import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Order } from "@/models/Order";
import { serializeOrder, type OrderLean } from "@/lib/orders/serialize";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

/** "Served": the food reached the guest. A dine-in seat stays taken until its bill is settled. */
export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(ROLES.counter);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.completeFailed", async () => {
    await connectToDatabase();
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.alreadyProcessed"), 409);

    const updated = await Order.findOneAndUpdate(
      { _id: id, status: { $in: ["PENDING", "READY"] } },
      { $set: { status: "COMPLETED", completedAt: new Date() } },
      { returnDocument: "after" }
    ).lean<OrderLean & { seatId?: unknown }>();
    if (!updated) return jsonError(t("err.alreadyProcessed"), 409);

    const dto = serializeOrder(updated);
    await Promise.all([
      emitRealtimeEvent(REALTIME_EVENTS.ORDER_COMPLETED, { id: dto.id, tokenNumber: dto.tokenNumber, businessDate: dto.businessDate }),
      updated.seatId ? emitRealtimeEvent(REALTIME_EVENTS.SEAT_UPDATED, { seatId: String(updated.seatId) }) : null,
      emitRealtimeEvent(REALTIME_EVENTS.ADMIN_STATS_UPDATED, { reason: "order:completed" }),
    ]);
    return NextResponse.json(dto);
  });
}
