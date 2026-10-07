import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { Order } from "@/models/Order";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { serializeOrder, type OrderLean } from "@/lib/orders/serialize";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";

/** Counter sends a guest's QR order on to the kitchens: PLACED → PENDING, atomically. */
export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(ROLES.counter);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.alreadyProcessed"), 409);
    const updated = await Order.findOneAndUpdate(
      { _id: id, status: "PLACED" },
      { $set: { status: "PENDING", acceptedAt: new Date() } },
      { returnDocument: "after" }
    ).lean<OrderLean>();
    if (!updated) return jsonError(t("err.alreadyProcessed"), 409);

    const dto = serializeOrder(updated);
    await emitRealtimeEvent(REALTIME_EVENTS.ORDER_ACCEPTED, { id: dto.id, seatCode: dto.seatCode, tokenNumber: dto.tokenNumber });
    return NextResponse.json(dto);
  });
}
