import { GuestSession, type GuestSessionDocument } from "@/models/GuestSession";
import { Order } from "@/models/Order";
import { Seat, type SeatDocument } from "@/models/Seat";
import { serializeOrder, type OrderLean } from "@/lib/orders/serialize";
import { seatCode, type ResolvedSeat } from "@/lib/tables";
import type { GuestIdentity } from "@/lib/guest/session";
import { verifiedEmail } from "@/lib/guest/verified";
import type { GuestStateDTO } from "@/types";

/**
 * How long a phone keeps showing "Thank you, your bill is settled" after the
 * counter closes its sitting. Short on purpose, and it carries no email or
 * amount: the next person to scan must never see the last guest's details.
 */
const ENDED_VISIBLE_MS = 15 * 60 * 1000;

/** What a guest's phone needs to render: who holds the QR, and their own orders if it's them. */
export async function getGuestState({ seat, table, code }: ResolvedSeat, guest: GuestIdentity | null): Promise<GuestStateDTO> {
  const [session, siblings] = await Promise.all([
    seat.currentSessionId ? GuestSession.findOne({ _id: seat.currentSessionId, status: "OPEN" }).lean<GuestSessionDocument>() : null,
    Seat.find({ tableId: seat.tableId, isActive: true, _id: { $ne: seat._id } }).sort({ label: 1 }).lean<SeatDocument[]>(),
  ]);
  const lock = !session ? "free" : guest && session.deviceId === guest.did ? "mine" : "taken";
  const orders =
    lock === "mine" && session
      ? (await Order.find({ guestSessionId: session._id }).sort({ createdAt: 1 }).lean<OrderLean[]>()).map(serializeOrder)
      : [];

  let ended: GuestStateDTO["ended"];
  if (lock !== "mine" && guest) {
    const last = await GuestSession.findOne({
      seatId: seat._id,
      deviceId: guest.did,
      status: "CLOSED",
      closedAt: { $gte: new Date(Date.now() - ENDED_VISIBLE_MS) },
    })
      .sort({ closedAt: -1 })
      .lean<GuestSessionDocument>();
    if (last?.closedReason) ended = { reason: last.closedReason };
  }

  return {
    seatCode: code,
    area: table.area || undefined,
    verifiedEmail: await verifiedEmail(guest),
    lock,
    orders,
    otherSeats: siblings.map((sibling) => seatCode(table.name, sibling.label)),
    ended,
  };
}
