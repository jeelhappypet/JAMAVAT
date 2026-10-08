import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { Seat, type SeatDocument } from "@/models/Seat";
import { GuestSession, type GuestSessionDocument } from "@/models/GuestSession";
import { Order } from "@/models/Order";
import { Bill } from "@/models/Bill";
import { Counter } from "@/models/Counter";
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
import type { BillDTO, BillLineDTO } from "@/types";

/** Bill numbers run on across days ("0142"), unlike token numbers which restart daily. */
async function nextBillNumber(): Promise<number> {
  const counter = await Counter.findOneAndUpdate({ _id: "bill" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return counter.seq;
}

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

    const seat = await Seat.findById(id).lean<SeatDocument>();
    if (!seat) return jsonError(t("err.notFound"), 404);
    if (!seat.currentSessionId || String(seat.currentSessionId) !== sessionId) return jsonError(t("err.alreadySettled"), 409);
    const session = await GuestSession.findOne({ _id: sessionId, status: "OPEN" }).lean<GuestSessionDocument>();
    if (!session) return jsonError(t("err.alreadySettled"), 409);

    const orders = await Order.find({ guestSessionId: session._id, status: { $ne: "CANCELLED" } })
      .sort({ createdAt: 1 })
      .lean<OrderLean[]>();
    const itemsTotal = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    if (discount > itemsTotal) return jsonError(t("err.discountTooHigh"), 400);

    // The atomic step: only one settle can close this sitting, so a double tap can't bill twice.
    if (!(await closeSeatSession(seat._id, session._id, "SETTLED"))) return jsonError(t("err.alreadySettled"), 409);

    const settledAt = new Date();
    await Order.updateMany(
      { guestSessionId: session._id, status: { $in: ["PENDING", "READY"] } },
      { $set: { status: "COMPLETED", completedAt: settledAt } }
    );

    const lines = billLines(orders);
    const total = itemsTotal - discount;
    const bill = await Bill.create({
      billNo: await nextBillNumber(),
      businessDate: getBusinessDate(settledAt),
      seatId: seat._id,
      seatCode: session.seatCode,
      guestSessionId: session._id,
      email: session.email || undefined,
      orderIds: orders.map((order) => order._id),
      lines,
      itemsTotal,
      discount,
      total,
      paymentMode,
      settledBy: staff.id,
      settledAt,
    });

    let emailStatus: BillDTO["emailStatus"] = "SKIPPED";
    if (sendEmail && session.email && isMailConfigured()) {
      try {
        const restaurant = await getRestaurantSettings();
        await sendMail({
          to: session.email,
          ...renderBillEmail({ restaurant, billNo: bill.billNo, seatCode: session.seatCode, settledAt, lines, itemsTotal, discount, total, paymentMode }),
        });
        emailStatus = "SENT";
      } catch (error) {
        // The bill is settled either way — a mail hiccup must not undo the payment.
        console.error("Thank-you email failed", error);
        emailStatus = "FAILED";
      }
      await Bill.updateOne({ _id: bill._id }, { $set: { emailStatus } });
    }

    await Promise.all([
      emitRealtimeEvent(REALTIME_EVENTS.SEAT_UPDATED, { seatId: id, settled: true }),
      notifyGuestSeat(seat._id),
      emitRealtimeEvent(REALTIME_EVENTS.ORDER_COMPLETED, { seatId: id }),
      emitRealtimeEvent(REALTIME_EVENTS.ADMIN_STATS_UPDATED, { reason: "seat:settled" }),
    ]);

    const dto: BillDTO = {
      id: String(bill._id),
      billNo: bill.billNo,
      seatCode: session.seatCode,
      email: session.email || undefined,
      lines,
      itemsTotal,
      discount,
      total,
      paymentMode,
      settledAt: settledAt.toISOString(),
      emailStatus,
    };
    return NextResponse.json(dto);
  });
}
