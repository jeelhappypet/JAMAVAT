import { NextResponse } from "next/server";
import { Order } from "@/models/Order";
import { Seat } from "@/models/Seat";
import { GuestSession, type GuestSessionDocument } from "@/models/GuestSession";
import { guestOrderSchema } from "@/lib/validation/guest";
import { resolveSeat } from "@/lib/tables";
import { getGuest } from "@/lib/guest/session";
import { verifiedEmail } from "@/lib/guest/verified";
import { buildOrderItems, nextTokenNumber } from "@/lib/orders/build";
import { serializeOrder, type OrderLean } from "@/lib/orders/serialize";
import { getBusinessDate } from "@/lib/utils/businessDate";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { getTranslator } from "@/lib/i18n/server";
import { isDuplicateKeyError, jsonError, respond } from "@/lib/api";

/**
 * A guest places an order from their QR. It goes straight to the kitchen
 * screens (no counter approval). The first order takes the QR's lock for
 * this device until the bill is settled; another phone on the same QR is
 * refused.
 */
export async function POST(request: Request) {
  const t = await getTranslator();
  return respond(t, "err.orderFailed", async () => {
    const { token, items, note, clientRequestId } = guestOrderSchema.parse(await request.json());

    const guest = await getGuest();
    const email = await verifiedEmail(guest);
    if (!guest || !email) return NextResponse.json({ error: t("err.verifyFirst"), code: "VERIFY" }, { status: 401 });

    const resolved = await resolveSeat(token);
    if (!resolved) return NextResponse.json({ error: t("err.qrInvalid"), code: "QR_INVALID" }, { status: 404 });
    const { seat, code } = resolved;

    const existing = await Order.findOne({ clientRequestId }).lean<OrderLean>();
    if (existing) return NextResponse.json(serializeOrder(existing));

    const built = await buildOrderItems(items, t);
    if (!built.ok) return jsonError(built.error, built.status);

    // Take (or confirm) this QR's lock for this device.
    let session = seat.currentSessionId
      ? await GuestSession.findOne({ _id: seat.currentSessionId, status: "OPEN" }).lean<GuestSessionDocument>()
      : null;
    let lockedNow = false;
    if (session && session.deviceId !== guest.did) {
      return NextResponse.json({ error: t("err.seatTaken"), code: "SEAT_TAKEN" }, { status: 409 });
    }
    if (!session) {
      const created = await GuestSession.create({ seatId: seat._id, seatCode: code, email, deviceId: guest.did });
      // Matches only if the QR is still free (or holds a session that was closed) — two phones can't both win.
      const claimed = await Seat.findOneAndUpdate(
        { _id: seat._id, $or: [{ currentSessionId: null }, { currentSessionId: seat.currentSessionId ?? null }] },
        { $set: { currentSessionId: created._id } },
        { returnDocument: "after" }
      ).lean();
      if (!claimed) {
        await GuestSession.deleteOne({ _id: created._id });
        return NextResponse.json({ error: t("err.seatTaken"), code: "SEAT_TAKEN" }, { status: 409 });
      }
      session = created.toObject() as GuestSessionDocument;
      lockedNow = true;
    }

    const businessDate = getBusinessDate();
    let created;
    try {
      created = await Order.create({
        tokenNumber: await nextTokenNumber(businessDate),
        businessDate,
        source: "QR",
        seatId: seat._id,
        seatCode: code,
        guestSessionId: session!._id,
        guestEmail: email,
        note: note || undefined,
        items: built.items,
        totalAmount: built.totalAmount,
        status: "PENDING",
        clientRequestId,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const raced = await Order.findOne({ clientRequestId }).lean<OrderLean>();
        if (raced) return NextResponse.json(serializeOrder(raced));
      }
      throw error;
    }

    const dto = serializeOrder(created.toObject());
    await Promise.all([
      emitRealtimeEvent(REALTIME_EVENTS.ORDER_CREATED, { id: dto.id, seatCode: code, tokenNumber: dto.tokenNumber }),
      // The counter's seat grid shows the new order (and the newly taken QR) either way.
      emitRealtimeEvent(REALTIME_EVENTS.SEAT_UPDATED, { seatId: String(seat._id), taken: lockedNow }),
      emitRealtimeEvent(REALTIME_EVENTS.ADMIN_STATS_UPDATED, { reason: "order:created" }),
    ]);
    return NextResponse.json(dto, { status: 201 });
  });
}
