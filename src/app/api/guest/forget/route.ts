import { NextResponse } from "next/server";
import { getGuest, setGuest } from "@/lib/guest/session";

/** "Not you?" — drops the verified email but keeps the device id (it may hold a QR lock). */
export async function POST() {
  const current = await getGuest();
  if (current) await setGuest({ did: current.did });
  return NextResponse.json({ ok: true });
}
