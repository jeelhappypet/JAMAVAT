import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { Seat, type SeatDocument } from "@/models/Seat";
import { GuestSession, type GuestSessionDocument } from "@/models/GuestSession";
import { Order } from "@/models/Order";
import { Bill } from "@/models/Bill";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { settleSchema } from "@/lib/validation/tables";
import { closeSeatSession } from "@/lib/tables";
import { getRestaurantSettings } from "@/lib/restaurant";
import { isMailConfigured, sendMail } from "@/lib/mail";
import { renderBillEmail } from "@/lib/billEmail";
import type { OrderLean } from "@/lib/orders/serialize";
import { getBusinessDate } from "@/lib/utils/businessDate";
import { emitRealtimeEvent, notifyGuestSeat } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";
import { createBill } from "@/lib/bills";
import { billTotals } from "@/lib/gst";
import type { BillDTO, BillLineDTO } from "@/types";

/** Same dish ordered twice in one sitting → one line on the bill. */
function billLines(orders: OrderLean[]): BillLineDTO[] {
  const lines = new Map<string, BillLineDTO>();
  for (const order of orders) {
    for (const item of order.items) {
      const key = `${String(item.menuItemId)}:${item.unitPrice}`;
      const line = lines.get(key) ?? { name: item.nameSnapshot, nameGu: item.nameGuSnapshot || undefined, quantity: 0, amount: 0 };
      line.quantity += item.quantity;
      line.amount += item.lineTotal;
      lines.set(key, line);
    }
  }
  return [...lines.values()];
}

/**
 * "Settle & free table": the guest paid at the counter. One bill for the
 * whole sitting, every order marked served, the QR freed for the next guest
 * and — if asked — the thank-you email with the bill details.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(ROLES.counter);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.settleFailed", async () => {
    const { id } = await params;
    if (!isValidObjectId(id)) return jsonError(t("err.notFound"), 404);
    const { sessionId, discount, paymentMode, sendEmail } = settleSchema.parse(await request.json());

    const { restaurantId } = staff;
    const seat = await Seat.findOne({ restaurantId, _id: id }).lean<SeatDocument>();
    if (!seat) return jsonError(t("err.notFound"), 404);
    if (!seat.currentSessionId || String(seat.currentSessionId) !== sessionId) return jsonError(t("err.alreadySettled"), 409);
    const session = await GuestSession.findOne({ restaurantId, _id: sessionId, status: "OPEN" }).lean<GuestSessionDocument>();
    if (!session) return jsonError(t("err.alreadySettled"), 409);

    // The restaurant's own details come along for the ride: the GST rate is
    // needed to bill at all, and the rest only if an email goes out.
    const [orders, restaurant] = await Promise.all([
      Order.find({ restaurantId, guestSessionId: session._id, status: { $ne: "CANCELLED" } }).sort({ createdAt: 1 }).lean<OrderLean[]>(),
      getRestaurantSettings(restaurantId),
    ]);
    const itemsTotal = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    if (discount > itemsTotal) return jsonError(t("err.discountTooHigh"), 400);

    const settledAt = new Date();
    const lines = billLines(orders);
    // GST (if the admin switched it on) is worked out here and stored with the
    // bill, so the counter screen, the stored row and the emailed invoice can
    // never disagree — and so next month's rate change can't rewrite this one.
    const { tax, total } = billTotals(itemsTotal, discount, restaurant.gst);
    // The bill is written before the table is freed: if it can't be written, the
    // guest's sitting stays open with its orders instead of vanishing unbilled.
    // One bill per sitting (unique guestSessionId), so a double tap can't bill twice.
    const bill = await createBill(restaurantId, {
      restaurantId,
      businessDate: getBusinessDate(settledAt),
      seatId: seat._id,
      seatCode: session.seatCode,
      guestSessionId: session._id,
      email: session.email || undefined,
      orderIds: orders.map((order) => order._id),
      lines,
      itemsTotal,
      discount,
      ...(tax ? { taxPercent: tax.percent, taxMode: tax.mode, taxAmount: tax.amount } : {}),
      total,
      paymentMode,
      settledBy: staff.id,
      settledAt,
    });
    if (!bill) return jsonError(t("err.alreadySettled"), 409);

    const { closed } = await closeSeatSession(restaurantId, seat._id, session._id, "SETTLED");
    if (!closed) {
      // Freed or settled from another screen in between — that one wins, this bill never happened.
      await Bill.deleteOne({ restaurantId, _id: bill._id });
      return jsonError(t("err.alreadySettled"), 409);
    }

    await Order.updateMany(
      { restaurantId, guestSessionId: session._id, status: { $in: ["PENDING", "READY"] } },
      { $set: { status: "COMPLETED", completedAt: settledAt } }
    );

    let emailStatus: BillDTO["emailStatus"] = "SKIPPED";
    if (sendEmail && session.email && isMailConfigured()) {
      try {
        await sendMail({
          to: session.email,
          ...renderBillEmail({ restaurant, billNo: bill.billNo, seatCode: session.seatCode, settledAt, lines, itemsTotal, discount, tax, total, paymentMode }),
        });
        emailStatus = "SENT";
      } catch (error) {
        // The bill is settled either way — a mail hiccup must not undo the payment.
        console.error("Thank-you email failed", error);
        emailStatus = "FAILED";
      }
      await Bill.updateOne({ restaurantId, _id: bill._id }, { $set: { emailStatus } });
    }

    await Promise.all([
      emitRealtimeEvent(restaurantId, REALTIME_EVENTS.SEAT_UPDATED, { seatId: id, settled: true }),
      notifyGuestSeat(restaurantId, seat._id),
      emitRealtimeEvent(restaurantId, REALTIME_EVENTS.ORDER_COMPLETED, { seatId: id }),
      emitRealtimeEvent(restaurantId, REALTIME_EVENTS.ADMIN_STATS_UPDATED, { reason: "seat:settled" }),
    ]);

    const dto: BillDTO = {
      id: String(bill._id),
      billNo: bill.billNo,
      seatCode: session.seatCode,
      email: session.email || undefined,
      lines,
      itemsTotal,
      discount,
      tax,
      total,
      paymentMode,
      settledAt: settledAt.toISOString(),
      emailStatus,
    };
    return NextResponse.json(dto);
  });
}
