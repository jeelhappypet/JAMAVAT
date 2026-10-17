import { NextResponse, type NextRequest } from "next/server";
import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Order } from "@/models/Order";
import type { GuestSessionDocument } from "@/models/GuestSession";
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
import { freeSeatIfNothingToPay, sittingForCounterOrder } from "@/lib/tables";

/**
 * Counter order: a parcel with a token number, or — with `seatId` — dishes
 * for a table that go on its bill: the open sitting's (a guest's "Add item"),
 * or a new sitting the counter opens on a free table (no email, no OTP; the
 * QR shows "in use" to anyone who scans it until the bill is settled).
 */
export async function POST(request: NextRequest) {
  const staff = await requireStaff(ROLES.counter, { orders: true });
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.orderFailed", async () => {
    await connectToDatabase();
    const { customerName, items, clientRequestId, seatId, paymentMode } = createOrderSchema.parse(await request.json());

    const { restaurantId } = staff;
    const existing = await Order.findOne({ restaurantId, clientRequestId }).lean<OrderLean>();
    if (existing) return NextResponse.json(serializeOrder(existing), { status: 200 });

    if (seatId && !isValidObjectId(seatId)) return jsonError(t("err.notFound"), 404);

    // Check the dishes before touching the table, so a sold-out dish never leaves a free QR locked.
    const built = await buildOrderItems(restaurantId, items, t);
    if (!built.ok) return jsonError(built.error, built.status);

    let sitting: { session: GuestSessionDocument; opened: boolean } | null = null;
    let seatLink: Record<string, unknown> = {};
    if (seatId) {
      sitting = await sittingForCounterOrder(restaurantId, seatId, staff.id);
      if (!sitting) return jsonError(t("err.seatNotInUse"), 409);
      const { session } = sitting;
      seatLink = { seatId: session.seatId, seatCode: session.seatCode, guestSessionId: session._id, guestEmail: session.email || undefined };
    }
    const businessDate = getBusinessDate();

    let created;
    try {
      created = await Order.create({
        restaurantId,
        tokenNumber: await nextTokenNumber(restaurantId, businessDate),
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
        const raced = await Order.findOne({ restaurantId, clientRequestId }).lean<OrderLean>();
        if (raced) return NextResponse.json(serializeOrder(raced), { status: 200 });
      }
      // Don't leave a table this request just opened locked with nothing on it.
      if (sitting?.opened) await freeSeatIfNothingToPay(restaurantId, sitting.session.seatId, sitting.session._id);
      throw error;
    }

    const dto = serializeOrder(created.toObject());
    await Promise.all([
      emitRealtimeEvent(restaurantId, REALTIME_EVENTS.ORDER_CREATED, { id: dto.id, seatCode: dto.seatCode, tokenNumber: dto.tokenNumber }),
      seatId ? emitRealtimeEvent(restaurantId, REALTIME_EVENTS.SEAT_UPDATED, { seatId }) : null,
      seatId ? notifyGuestSeat(restaurantId, seatId) : null,
      emitRealtimeEvent(restaurantId, REALTIME_EVENTS.ADMIN_STATS_UPDATED, { reason: "order:created" }),
    ]);
    return NextResponse.json(dto, { status: 201 });
  });
}
