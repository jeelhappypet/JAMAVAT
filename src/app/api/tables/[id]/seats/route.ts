import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import { Table } from "@/models/Table";
import { Seat, type SeatDocument } from "@/models/Seat";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { SEAT_LABELS, newSeatToken } from "@/lib/tables";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { getTranslator } from "@/lib/i18n/server";
import { jsonError, respond } from "@/lib/api";
import { seatBudget } from "@/lib/limits";

/** Adds the next QR (side) to a table: A → B → C… */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { id } = await params;
    const { restaurantId } = staff;
    if (!isValidObjectId(id) || !(await Table.exists({ restaurantId, _id: id }))) return jsonError(t("err.notFound"), 404);
    const allowed = await seatBudget(restaurantId, 1);
    if (!allowed.ok) return jsonError(t("err.planSeatLimit", { n: allowed.max }), 402);
    const used = new Set((await Seat.find({ restaurantId, tableId: id }).select({ label: 1 }).lean<Pick<SeatDocument, "label">[]>()).map((s) => s.label));
    const label = SEAT_LABELS.find((candidate) => !used.has(candidate));
    if (!label) return jsonError(t("err.tooManySeats"), 409);
    const seat = await Seat.create({ restaurantId, tableId: id, label, token: newSeatToken() });
    await emitRealtimeEvent(restaurantId, REALTIME_EVENTS.SEAT_UPDATED, { tableId: id });
    return NextResponse.json({ id: String(seat._id) }, { status: 201 });
  });
}
