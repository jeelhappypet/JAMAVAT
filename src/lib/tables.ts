import { randomBytes } from "crypto";
import { cache } from "react";
import { headers } from "next/headers";
import { connectToDatabase } from "@/lib/db/mongodb";
import { toObjectId, type RestaurantRef } from "@/lib/db/tenant";
import { Table, type TableDocument } from "@/models/Table";
import { Seat, type SeatDocument } from "@/models/Seat";
import { GuestSession, type GuestSessionDocument } from "@/models/GuestSession";
import { Order } from "@/models/Order";
import { Category, type CategoryDocument } from "@/models/Category";
import { Menu, type MenuDocument } from "@/models/Menu";
import { ORDER_FIELDS, serializeOrder, type OrderLean } from "@/lib/orders/serialize";
import { getRestaurantInfo } from "@/lib/restaurant";
import type { OrderDTO, SeatDTO, SeatDetailDTO, SeatState, TableDTO } from "@/types";

/** A seat shows "New order" on the counter for this long after its latest order. */
const NEW_ORDER_MS = 5 * 60 * 1000;

/** "4" + "A" → "4A"; "Garden" + "A" → "Garden A". */
export function seatCode(tableName: string, label: string): string {
  return /\d$/.test(tableName) ? `${tableName}${label}` : `${tableName} ${label}`;
}

/** Unguessable, URL-safe — this is what's printed in the QR. */
export function newSeatToken(): string {
  return randomBytes(12).toString("base64url");
}

export const SEAT_LABELS = ["A", "B", "C", "D", "E", "F"];

/** Origin for links printed in QRs: APP_URL if set, else the host this request came in on. */
export async function getBaseUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function guestUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/t/${token}`;
}

/** Every table with its QRs and who (if anyone) holds each QR right now. */
export async function loadTables(restaurantId: RestaurantRef, { activeOnly = false } = {}): Promise<TableDTO[]> {
  await connectToDatabase();
  const active = activeOnly ? { restaurantId, isActive: true } : { restaurantId };
  const [tables, seats] = await Promise.all([
    Table.find(active).sort({ sortOrder: 1, createdAt: 1 }).lean<TableDocument[]>(),
    Seat.find(active).sort({ label: 1 }).lean<SeatDocument[]>(),
  ]);
  const sessionIds = seats.map((seat) => seat.currentSessionId).filter(Boolean);
  const [sessions, orderCounts] = await Promise.all([
    GuestSession.find({ restaurantId, _id: { $in: sessionIds } }).lean<GuestSessionDocument[]>(),
    Order.aggregate<{ _id: unknown; count: number; total: number; lastPending: Date | null }>([
      { $match: { restaurantId: toObjectId(restaurantId), guestSessionId: { $in: sessionIds }, status: { $ne: "CANCELLED" } } },
      {
        $group: {
          _id: "$guestSessionId",
          count: { $sum: 1 },
          total: { $sum: "$totalAmount" },
          lastPending: { $max: { $cond: [{ $eq: ["$status", "PENDING"] }, "$createdAt", null] } },
        },
      },
    ]),
  ]);
  const now = Date.now();
  const stateOf = (stats?: { lastPending: Date | null }): SeatState => {
    if (stats?.lastPending && now - new Date(stats.lastPending).getTime() < NEW_ORDER_MS) return "new";
    return "eating";
  };
  const sessionById = new Map(sessions.map((s) => [String(s._id), s]));
  const countBySession = new Map(orderCounts.map((c) => [String(c._id), c]));

  return tables.map((table) => ({
    id: String(table._id),
    name: table.name,
    area: table.area || undefined,
    isActive: table.isActive !== false,
    seats: seats
      .filter((seat) => String(seat.tableId) === String(table._id))
      .map((seat): SeatDTO => {
        const session = seat.currentSessionId ? sessionById.get(String(seat.currentSessionId)) : undefined;
        const stats = session ? countBySession.get(String(session._id)) : undefined;
        return {
          id: String(seat._id),
          tableId: String(table._id),
          label: seat.label,
          code: seatCode(table.name, seat.label),
          token: seat.token,
          isActive: seat.isActive !== false,
          session: session
            ? {
                id: String(session._id),
                email: session.email || undefined,
                openedAt: session.createdAt.toISOString(),
                orderCount: stats?.count ?? 0,
                total: stats?.total ?? 0,
                state: stateOf(stats),
              }
            : undefined,
        };
      }),
  }));
}

export interface ResolvedSeat {
  seat: SeatDocument;
  table: TableDocument;
  code: string;
  /** The QR token is unique across Jamavat, so scanning one also says which restaurant it belongs to. */
  restaurantId: string;
}

/**
 * A guest's QR token → its seat and table, or null if the QR is unknown,
 * switched off or regenerated.
 *
 * Read once per request: the guest page resolves the same token in
 * `generateMetadata` (for the tab title) and again to render, which was two
 * extra round trips on the one screen a guest waits for.
 */
export const resolveSeat = cache(async (token: string): Promise<ResolvedSeat | null> => {
  if (!/^[\w-]{8,64}$/.test(token)) return null;
  await connectToDatabase();
  // The only lookup that may cross restaurants: nobody has told us which one yet.
  const seat = await Seat.findOne({ token, isActive: true }).setOptions({ crossTenant: true }).lean<SeatDocument>();
  if (!seat) return null;
  const restaurantId = String(seat.restaurantId);
  const table = await Table.findOne({ restaurantId, _id: seat.tableId, isActive: true }).lean<TableDocument>();
  if (!table) return null;
  return { seat, table, code: seatCode(table.name, seat.label), restaurantId };
});

/**
 * Releases a QR's lock. Conditional on it still being that session, so it
 * can't free a newer guest. `closed` is true only for the call that actually
 * closed the session — settle uses that so a double tap bills once.
 *
 * Freeing (not settling) abandons the table rather than billing it, so any
 * order still PENDING/READY on that sitting is cancelled here too — nobody
 * will ever serve or pay for it, and it would otherwise keep showing on the
 * counter's "recently ready" list for a table that's now empty.
 * `freeSeatIfNothingToPay` also passes "FREED" but only once nothing is left
 * open, so this cancels nothing extra in that path.
 */
export async function closeSeatSession(
  restaurantId: RestaurantRef,
  seatId: unknown,
  sessionId: unknown,
  reason: "FREED" | "SETTLED"
): Promise<{ closed: boolean; cancelledOrders: OrderDTO[] }> {
  const closed = await GuestSession.updateOne(
    { restaurantId, _id: sessionId, status: "OPEN" },
    { $set: { status: "CLOSED", closedAt: new Date(), closedReason: reason } }
  );
  await Seat.updateOne({ restaurantId, _id: seatId, currentSessionId: sessionId }, { $set: { currentSessionId: null } });

  let cancelledOrders: OrderDTO[] = [];
  if (closed.modifiedCount === 1 && reason === "FREED") {
    const dangling = await Order.find({ restaurantId, guestSessionId: sessionId, status: { $in: ["PENDING", "READY"] } }).lean<OrderLean[]>();
    if (dangling.length) {
      await Order.updateMany(
        { restaurantId, guestSessionId: sessionId, status: { $in: ["PENDING", "READY"] } },
        { $set: { status: "CANCELLED", cancelledAt: new Date() } }
      );
      cancelledOrders = dangling.map(serializeOrder);
    }
  }
  return { closed: closed.modifiedCount === 1, cancelledOrders };
}

/**
 * Where a counter order for a table goes: the sitting already open on that
 * QR (a guest's, or one the counter opened), or — when the QR is free — a
 * new sitting the counter opens for a walk-in table. That one has no email
 * and belongs to no phone, so anyone who scans the QR sees "in use" until
 * it's settled or freed. Taking the lock is the same conditional update a
 * guest's first order uses: if a guest's phone wins the race, the counter's
 * dishes simply join the guest's sitting.
 */
export async function sittingForCounterOrder(
  restaurantId: RestaurantRef,
  seatId: string,
  staffId: string
): Promise<{ session: GuestSessionDocument; opened: boolean } | null> {
  await connectToDatabase();
  const seat = await Seat.findOne({ restaurantId, _id: seatId }).lean<SeatDocument>();
  if (!seat) return null;
  const openSession = (id: unknown) => GuestSession.findOne({ restaurantId, _id: id, status: "OPEN" }).lean<GuestSessionDocument>();

  const current = seat.currentSessionId ? await openSession(seat.currentSessionId) : null;
  if (current) return { session: current, opened: false };

  if (seat.isActive === false) return null;
  const table = await Table.findOne({ restaurantId, _id: seat.tableId, isActive: true }).lean<TableDocument>();
  if (!table) return null;

  const created = await GuestSession.create({
    restaurantId,
    seatId: seat._id,
    seatCode: seatCode(table.name, seat.label),
    deviceId: `counter:${staffId}`,
    openedBy: "COUNTER",
  });
  const claimed = await Seat.findOneAndUpdate(
    { restaurantId, _id: seat._id, $or: [{ currentSessionId: null }, { currentSessionId: seat.currentSessionId ?? null }] },
    { $set: { currentSessionId: created._id } },
    { returnDocument: "after" }
  ).lean();
  if (claimed) return { session: created.toObject() as GuestSessionDocument, opened: true };

  await GuestSession.deleteOne({ restaurantId, _id: created._id });
  const winner = await Seat.findOne({ restaurantId, _id: seat._id }).select({ currentSessionId: 1 }).lean<Pick<SeatDocument, "currentSessionId">>();
  const session = winner?.currentSessionId ? await openSession(winner.currentSessionId) : null;
  return session ? { session, opened: false } : null;
}

/** Frees the QR once a sitting has nothing left to pay for (its last order was cancelled). */
export async function freeSeatIfNothingToPay(restaurantId: RestaurantRef, seatId: unknown, sessionId: unknown): Promise<boolean> {
  const remaining = await Order.countDocuments({ restaurantId, guestSessionId: sessionId, status: { $ne: "CANCELLED" } });
  if (remaining > 0) return false;
  const { closed } = await closeSeatSession(restaurantId, seatId, sessionId, "FREED");
  return closed;
}

/** The counter's seat page: who holds the QR and every order of their sitting. */
export async function loadSeatDetail(restaurantId: RestaurantRef, seatId: string): Promise<SeatDetailDTO | null> {
  await connectToDatabase();
  const seat = await Seat.findOne({ restaurantId, _id: seatId }).lean<SeatDocument>();
  if (!seat) return null;
  const table = await Table.findOne({ restaurantId, _id: seat.tableId }).lean<TableDocument>();
  if (!table) return null;
  const session = seat.currentSessionId
    ? await GuestSession.findOne({ restaurantId, _id: seat.currentSessionId, status: "OPEN" }).lean<GuestSessionDocument>()
    : null;
  const orders = session
    ? (await Order.find({ restaurantId, guestSessionId: session._id }).select(ORDER_FIELDS).sort({ createdAt: 1 }).lean<OrderLean[]>()).map(serializeOrder)
    : [];
  // Name each item's kitchen here, so the page doesn't need the whole menu for one column.
  const categoryIds = [...new Set(orders.flatMap((order) => order.items.map((item) => item.categoryId).filter(Boolean)))];
  const categories = categoryIds.length ? await Category.find({ restaurantId, _id: { $in: categoryIds } }).select({ menuId: 1 }).lean<Pick<CategoryDocument, "_id" | "menuId">[]>() : [];
  const menus = categories.length
    ? await Menu.find({ restaurantId, _id: { $in: categories.map((c) => c.menuId) } }).select({ name: 1, nameGu: 1 }).lean<Pick<MenuDocument, "_id" | "name" | "nameGu">[]>()
    : [];
  const menuById = new Map(menus.map((menu) => [String(menu._id), menu]));
  const kitchens: SeatDetailDTO["kitchens"] = {};
  for (const category of categories) {
    const menu = menuById.get(String(category.menuId));
    if (menu) kitchens[String(category._id)] = { name: menu.name, nameGu: menu.nameGu || undefined };
  }
  return {
    seat: { id: String(seat._id), code: seatCode(table.name, seat.label), label: seat.label, tableName: table.name, area: table.area || undefined },
    session: session ? { id: String(session._id), email: session.email || undefined, openedAt: session.createdAt.toISOString() } : undefined,
    orders,
    kitchens,
    // The settle panel works the tax out the same way the settle call does, so
    // the counter tells the guest the number they are about to be charged.
    gst: (await getRestaurantInfo(restaurantId))?.gst ?? { enabled: false, percent: 0, mode: "CGST_SGST" },
  };
}
