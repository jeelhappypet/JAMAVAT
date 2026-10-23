import { GuestSession, type GuestSessionDocument } from "@/models/GuestSession";
import { Order } from "@/models/Order";
import { Seat, type SeatDocument } from "@/models/Seat";
import { ORDER_FIELDS, serializeOrder, type OrderLean } from "@/lib/orders/serialize";
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
export async function getGuestState({ seat, table, code, restaurantId }: ResolvedSeat, guest: GuestIdentity | null): Promise<GuestStateDTO> {
  const [session, siblings] = await Promise.all([
    seat.currentSessionId ? GuestSession.findOne({ restaurantId, _id: seat.currentSessionId, status: "OPEN" }).select({ deviceId: 1 }).lean<GuestSessionDocument>() : null,
    Seat.find({ restaurantId, tableId: seat.tableId, isActive: true, _id: { $ne: seat._id } }).select({ label: 1 }).sort({ label: 1 }).lean<SeatDocument[]>(),
  ]);
  const lock = !session ? "free" : guest && session.deviceId === guest.did ? "mine" : "taken";
  const mine = lock === "mine" && session ? session : null;

  // Everything the rest of the screen needs goes out together. This is the
  // call a guest's phone repeats while it waits for food (every 10s without
  // Pusher), so it costs two round trips, not four: the orders, the "your
  // bill is settled" card and the verified email used to run one after the
  // other.
  const [orderDocs, lastClosed, email] = await Promise.all([
    mine ? Order.find({ restaurantId, guestSessionId: mine._id }).select(ORDER_FIELDS).sort({ createdAt: 1 }).lean<OrderLean[]>() : [],
    // Only a phone that no longer holds the QR can be owed a thank-you card.
    lock !== "mine" && guest
      ? GuestSession.findOne({
          restaurantId,
          seatId: seat._id,
          deviceId: guest.did,
          status: "CLOSED",
          closedAt: { $gte: new Date(Date.now() - ENDED_VISIBLE_MS) },
        })
          .select({ closedReason: 1 })
          .sort({ closedAt: -1 })
          .lean<GuestSessionDocument>()
      : null,
    // An OPEN sitting of this device is exactly what `verifiedEmail` asks
    // Mongo for first — when the QR is ours, `session` already proves it.
    mine && guest?.email && guest.vt ? guest.email : verifiedEmail(restaurantId, guest),
  ]);

  return {
    seatCode: code,
    area: table.area || undefined,
    verifiedEmail: email,
    lock,
    orders: orderDocs.map(serializeOrder),
    otherSeats: siblings.map((sibling) => seatCode(table.name, sibling.label)),
    ended: lastClosed?.closedReason ? { reason: lastClosed.closedReason } : undefined,
  };
}
