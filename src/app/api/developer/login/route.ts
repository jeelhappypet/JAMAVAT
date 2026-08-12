import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ZodError } from "zod";
import { developerLoginSchema } from "@/lib/validation/developer";
import { createSessionToken, verifyCredentials, ADMIN_SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = developerLoginSchema.parse(body);

    if (!verifyCredentials(username, password)) {
      return NextResponse.json({ error: "અમાન્ય યુઝરનેમ અથવા પાસવર્ડ" }, { status: 401 });
    }

    const token = createSessionToken(username);
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 60 * 60,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "યુઝરનેમ અને પાસવર્ડ જરૂરી છે" }, { status: 400 });
    }
    return NextResponse.json({ error: "લોગિન કરી શકાયું નથી" }, { status: 500 });
  }
}
