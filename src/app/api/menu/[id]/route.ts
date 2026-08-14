import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongodb";
import { MenuItem } from "@/models/MenuItem";
import { emitRealtimeEvent } from "@/lib/realtime/server";
import { REALTIME_EVENTS } from "@/lib/realtime/events";

/**
 * Hard delete. Safe even though Order.items[].menuItemId references
 * MenuItem — every order item also carries its own name/category/price
 * snapshot, so historical orders never need to dereference the MenuItem
 * document and a dangling id causes no display issue.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const deleted = await MenuItem.findByIdAndDelete(id).lean();
    if (!deleted) {
      return NextResponse.json({ error: "આઇટમ મળી નથી" }, { status: 404 });
    }

    emitRealtimeEvent(REALTIME_EVENTS.MENU_UPDATED, { reason: "deleted" });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "આઇટમ કાઢી શકાઈ નથી" }, { status: 500 });
  }
}
