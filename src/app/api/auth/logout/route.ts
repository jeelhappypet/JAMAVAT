import { NextResponse } from "next/server";
import { endSession } from "@/lib/auth/staff";

export async function POST() {
  await endSession();
  return NextResponse.json({ ok: true });
}
