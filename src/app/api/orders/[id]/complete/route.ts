import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Order } from "@/models/Order";
import { serializeOrder } from "@/lib/orders/serialize";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const updated = await Order.findOneAndUpdate(
      { _id: id, status: { $in: ["PENDING", "READY"] } },
      { $set: { status: "COMPLETED", completedAt: new Date() } },
      { returnDocument: "after" }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "ઓર્ડર પહેલેથી પ્રોસેસ થઈ ગયો છે" }, { status: 409 });
    }

    const dto = serializeOrder(updated);
    emitRealtimeEvent(REALTIME_EVENTS.ORDER_COMPLETED, {
      id: dto.id,
      tokenNumber: dto.tokenNumber,
      businessDate: dto.businessDate,
    });
    emitRealtimeEvent(REALTIME_EVENTS.ADMIN_STATS_UPDATED, { reason: "order:completed" });

    return NextResponse.json(dto);
  } catch {
    return NextResponse.json({ error: "ઓર્ડર પૂર્ણ કરી શકાયો નથી" }, { status: 500 });
  }
}
