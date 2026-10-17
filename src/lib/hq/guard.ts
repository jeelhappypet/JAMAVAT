import { NextResponse } from "next/server";
import { getHqEmail } from "@/lib/hq/session";

/** Every /api/hq route starts here: the signed-in HQ address, or a 401 to return as-is. */
export async function requireHq(): Promise<string | NextResponse> {
  const email = await getHqEmail();
  if (!email) return NextResponse.json({ error: "Sign in to Jamavat HQ" }, { status: 401 });
  return email;
}
