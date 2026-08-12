import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Order } from "@/models/Order";
import { serializeOrder } from "@/lib/orders/serialize";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";

/**
 * Kitchen's only action on an order: PENDING -> READY. This removes it
 * from the kitchen's own queue (Pending Order) but must NOT remove it from
 * the counter's queue (Live Order) — only the counter's own complete/cancel
 * finalizes an order. Kitchen has no cancel action at all; that authority
 * belongs to the counter.
 */
export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const updated = await Order.findOneAndUpdate(
      { _id: id, status: "PENDING" },
      { $set: { status: "READY", readyAt: new Date() } },
      { returnDocument: "after" }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "ઓર્ડર પહેલેથી પ્રોસેસ થઈ ગયો છે" }, { status: 409 });
    }

    const dto = serializeOrder(updated);
    emitRealtimeEvent(REALTIME_EVENTS.ORDER_READY, {
      id: dto.id,
      tokenNumber: dto.tokenNumber,
      businessDate: dto.businessDate,
    });

    return NextResponse.json(dto);
  } catch {
    return NextResponse.json({ error: "ઓર્ડર તૈયાર તરીકે માર્ક કરી શકાયો નથી" }, { status: 500 });
  }
}
