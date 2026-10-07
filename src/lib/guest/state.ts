import { GuestSession, type GuestSessionDocument } from "@/models/GuestSession";
import { Order } from "@/models/Order";
import { serializeOrder, type OrderLean } from "@/lib/orders/serialize";
import type { ResolvedSeat } from "@/lib/tables";
import type { GuestIdentity } from "@/lib/guest/session";
import type { GuestStateDTO } from "@/types";

/** What a guest's phone needs to render: who holds the QR, and their own orders if it's them. */
export async function getGuestState({ seat, table, code }: ResolvedSeat, guest: GuestIdentity | null): Promise<GuestStateDTO> {
  const session = seat.currentSessionId
    ? await GuestSession.findOne({ _id: seat.currentSessionId, status: "OPEN" }).lean<GuestSessionDocument>()
    : null;
  const lock = !session ? "free" : guest && session.deviceId === guest.did ? "mine" : "taken";
  const orders =
    lock === "mine" && session
      ? (await Order.find({ guestSessionId: session._id }).sort({ createdAt: 1 }).lean<OrderLean[]>()).map(serializeOrder)
      : [];
  return { seatCode: code, area: table.area || undefined, verifiedEmail: guest?.email, lock, orders };
}
