import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Order } from "@/models/Order";
import { Seat, type SeatDocument } from "@/models/Seat";
import { GuestSession, type GuestSessionDocument } from "@/models/GuestSession";
import { createOrderSchema } from "@/lib/validation/order";
import { getBusinessDate } from "@/lib/utils/businessDate";
import { serializeOrder, type OrderLean } from "@/lib/orders/serialize";
import { emitRealtimeEvent, notifyGuestSeat } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getTranslator } from "@/lib/i18n/server";
import { isDuplicateKeyError, jsonError, respond } from "@/lib/api";
import { buildOrderItems, nextTokenNumber } from "@/lib/orders/build";

/**
 * Counter order: a parcel with a token number, or — with `seatId` — extra
 * dishes for a seated guest that go on their bill.
 */
export async function POST(request: NextRequest) {
  const staff = await requireStaff(ROLES.counter);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.orderFailed", async () => {
    await connectToDatabase();
    const { customerName, items, clientRequestId, seatId, paymentMode } = createOrderSchema.parse(await request.json());

    const existing = await Order.findOne({ clientRequestId }).lean<OrderLean>();
    if (existing) return NextResponse.json(serializeOrder(existing), { status: 200 });

    let seatLink: Record<string, unknown> = {};
    if (seatId) {
      const seat = isValidObjectId(seatId) ? await Seat.findById(seatId).lean<SeatDocument>() : null;
      const session = seat?.currentSessionId
        ? await GuestSession.findOne({ _id: seat.currentSessionId, status: "OPEN" }).lean<GuestSessionDocument>()
        : null;
      if (!seat || !session) return jsonError(t("err.seatNotInUse"), 409);
      seatLink = { seatId: seat._id, seatCode: session.seatCode, guestSessionId: session._id, guestEmail: session.email };
    }

    const built = await buildOrderItems(items, t);
    if (!built.ok) return jsonError(built.error, built.status);
    const businessDate = getBusinessDate();

    let created;
    try {
      created = await Order.create({
        tokenNumber: await nextTokenNumber(businessDate),
        businessDate,
        source: "COUNTER",
        customerName: customerName || undefined,
        ...seatLink,
        ...(seatId ? {} : { paymentMode: paymentMode ?? "CASH" }),
        items: built.items,
        totalAmount: built.totalAmount,
        status: "PENDING",
        clientRequestId,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const raced = await Order.findOne({ clientRequestId }).lean<OrderLean>();
        if (raced) return NextResponse.json(serializeOrder(raced), { status: 200 });
      }
      throw error;
    }

    const dto = serializeOrder(created.toObject());
    await Promise.all([
      emitRealtimeEvent(REALTIME_EVENTS.ORDER_CREATED, { id: dto.id, seatCode: dto.seatCode, tokenNumber: dto.tokenNumber }),
      seatId ? emitRealtimeEvent(REALTIME_EVENTS.SEAT_UPDATED, { seatId }) : null,
      seatId ? notifyGuestSeat(seatId) : null,
      emitRealtimeEvent(REALTIME_EVENTS.ADMIN_STATS_UPDATED, { reason: "order:created" }),
    ]);
    return NextResponse.json(dto, { status: 201 });
  });
}
