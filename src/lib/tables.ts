import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Table, type TableDocument } from "@/models/Table";
import { Seat, type SeatDocument } from "@/models/Seat";
import { GuestSession, type GuestSessionDocument } from "@/models/GuestSession";
import { Order } from "@/models/Order";
import { Category, type CategoryDocument } from "@/models/Category";
import { Menu, type MenuDocument } from "@/models/Menu";
import { serializeOrder, type OrderLean } from "@/lib/orders/serialize";
import type { SeatDTO, SeatDetailDTO, SeatState, TableDTO } from "@/types";

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
export async function loadTables({ activeOnly = false } = {}): Promise<TableDTO[]> {
  await connectToDatabase();
  const active = activeOnly ? { isActive: true } : {};
  const [tables, seats] = await Promise.all([
    Table.find(active).sort({ sortOrder: 1, createdAt: 1 }).lean<TableDocument[]>(),
    Seat.find(active).sort({ label: 1 }).lean<SeatDocument[]>(),
  ]);
  const sessionIds = seats.map((seat) => seat.currentSessionId).filter(Boolean);
  const [sessions, orderCounts] = await Promise.all([
    GuestSession.find({ _id: { $in: sessionIds } }).lean<GuestSessionDocument[]>(),
    Order.aggregate<{ _id: unknown; count: number; total: number; lastPending: Date | null }>([
      { $match: { guestSessionId: { $in: sessionIds }, status: { $ne: "CANCELLED" } } },
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
}

/** A guest's QR token → its seat and table, or null if the QR is unknown, switched off or regenerated. */
export async function resolveSeat(token: string): Promise<ResolvedSeat | null> {
  if (!/^[\w-]{8,64}$/.test(token)) return null;
  await connectToDatabase();
  const seat = await Seat.findOne({ token, isActive: true }).lean<SeatDocument>();
  if (!seat) return null;
  const table = await Table.findOne({ _id: seat.tableId, isActive: true }).lean<TableDocument>();
  if (!table) return null;
  return { seat, table, code: seatCode(table.name, seat.label) };
}

/**
 * Releases a QR's lock. Conditional on it still being that session, so it
 * can't free a newer guest. Returns true only for the call that actually
 * closed the session — settle uses that so a double tap bills once.
 */
export async function closeSeatSession(seatId: unknown, sessionId: unknown, reason: "FREED" | "SETTLED"): Promise<boolean> {
  const closed = await GuestSession.updateOne(
    { _id: sessionId, status: "OPEN" },
    { $set: { status: "CLOSED", closedAt: new Date(), closedReason: reason } }
  );
  await Seat.updateOne({ _id: seatId, currentSessionId: sessionId }, { $set: { currentSessionId: null } });
  return closed.modifiedCount === 1;
}

/** Frees the QR once a sitting has nothing left to pay for (its last order was cancelled). */
export async function freeSeatIfNothingToPay(seatId: unknown, sessionId: unknown): Promise<boolean> {
  const remaining = await Order.countDocuments({ guestSessionId: sessionId, status: { $ne: "CANCELLED" } });
  if (remaining > 0) return false;
  return closeSeatSession(seatId, sessionId, "FREED");
}

/** The counter's seat page: who holds the QR and every order of their sitting. */
export async function loadSeatDetail(seatId: string): Promise<SeatDetailDTO | null> {
  await connectToDatabase();
  const seat = await Seat.findById(seatId).lean<SeatDocument>();
  if (!seat) return null;
  const table = await Table.findById(seat.tableId).lean<TableDocument>();
  if (!table) return null;
  const session = seat.currentSessionId
    ? await GuestSession.findOne({ _id: seat.currentSessionId, status: "OPEN" }).lean<GuestSessionDocument>()
    : null;
  const orders = session
    ? (await Order.find({ guestSessionId: session._id }).sort({ createdAt: 1 }).lean<OrderLean[]>()).map(serializeOrder)
    : [];
  // Name each item's kitchen here, so the page doesn't need the whole menu for one column.
  const categoryIds = [...new Set(orders.flatMap((order) => order.items.map((item) => item.categoryId).filter(Boolean)))];
  const categories = categoryIds.length ? await Category.find({ _id: { $in: categoryIds } }).select({ menuId: 1 }).lean<Pick<CategoryDocument, "_id" | "menuId">[]>() : [];
  const menus = categories.length
    ? await Menu.find({ _id: { $in: categories.map((c) => c.menuId) } }).select({ name: 1, nameGu: 1 }).lean<Pick<MenuDocument, "_id" | "name" | "nameGu">[]>()
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
  };
}
