import { NextResponse } from "next/server";
import { Table } from "@/models/Table";
import { Seat } from "@/models/Seat";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { tableCreateSchema } from "@/lib/validation/tables";
import { SEAT_LABELS, loadTables, newSeatToken } from "@/lib/tables";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { getTranslator } from "@/lib/i18n/server";
import { respond } from "@/lib/api";

/** Tables with their QRs and who holds each one — admin manages them, the counter frees them. */
export async function GET() {
  const staff = await requireStaff(ROLES.counter);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();
  return respond(t, "err.tablesLoad", async () => NextResponse.json({ tables: await loadTables() }));
}

export async function POST(request: Request) {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { name, area, seats } = tableCreateSchema.parse(await request.json());
    const last = await Table.findOne().sort({ sortOrder: -1 }).select({ sortOrder: 1 }).lean<{ sortOrder?: number }>();
    const table = await Table.create({ name, area: area || undefined, sortOrder: (last?.sortOrder ?? -1) + 1 });
    await Seat.insertMany(SEAT_LABELS.slice(0, seats).map((label) => ({ tableId: table._id, label, token: newSeatToken() })));
    await emitRealtimeEvent(REALTIME_EVENTS.SEAT_UPDATED, { tableId: String(table._id) });
    return NextResponse.json({ id: String(table._id) }, { status: 201 });
  });
}
