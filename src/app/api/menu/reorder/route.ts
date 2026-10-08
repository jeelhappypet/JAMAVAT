import { NextResponse } from "next/server";
import { Menu } from "@/models/Menu";
import { Category } from "@/models/Category";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { reorderSchema } from "@/lib/validation/menu";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";
import { getTranslator } from "@/lib/i18n/server";
import { respond } from "@/lib/api";

/** Saves a new display order: `ids` in the order they should appear. */
export async function POST(request: Request) {
  const staff = await requireStaff(ROLES.admin);
  if (staff instanceof NextResponse) return staff;
  const t = await getTranslator();

  return respond(t, "err.saveFailed", async () => {
    const { kind, ids } = reorderSchema.parse(await request.json());
    const model = kind === "menu" ? Menu : Category;
    await model.bulkWrite(ids.map((id, index) => ({ updateOne: { filter: { _id: id }, update: { $set: { sortOrder: index } } } })));
    await emitRealtimeEvent(REALTIME_EVENTS.MENU_UPDATED, { reason: `${kind}-reordered` });
    return NextResponse.json({ ok: true });
  });
}
