import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth/staff";
import { ROLES } from "@/lib/auth/access";
import { getPusher } from "@/lib/realtime/server";
import { staffChannel, whatsAppChannel } from "@/lib/realtime/events";

/** pusher-js calls this before subscribing to a private channel; only logged-in staff get a signature. */
export async function POST(request: Request) {
  const staff = await requireStaff(ROLES.anyStaff);
  if (staff instanceof NextResponse) return staff;

  const pusher = getPusher();
  if (!pusher) return NextResponse.json({ error: "Realtime is not configured" }, { status: 503 });

  const form = await request.formData();
  const socketId = String(form.get("socket_id") ?? "");
  const channel = String(form.get("channel_name") ?? "");
  // Only this staff member's own restaurant — a signature for another one's channel is never issued.
  const allowed =
    channel === staffChannel(staff.restaurantId) ||
    (channel === whatsAppChannel(staff.restaurantId) && (ROLES.whatsapp as readonly string[]).includes(staff.role));
  if (!socketId || !allowed) {
    return NextResponse.json({ error: "Unknown channel" }, { status: 403 });
  }

  return NextResponse.json(pusher.authorizeChannel(socketId, channel));
}
