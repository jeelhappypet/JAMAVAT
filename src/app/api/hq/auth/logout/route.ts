import { NextResponse } from "next/server";
import { endHqSession } from "@/lib/hq/session";

export async function POST() {
  await endHqSession();
  return NextResponse.json({ ok: true });
}
