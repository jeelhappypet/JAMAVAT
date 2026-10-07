import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * Guests never log in. They carry a signed cookie with a random device id
 * (the QR lock belongs to the device) and — once they've passed the email
 * OTP — their verified email. "Remember this phone" keeps it for 30 days;
 * otherwise it lasts until the browser closes.
 */
export const GUEST_COOKIE = "jamavat_guest";
const REMEMBER_SECONDS = 30 * 24 * 60 * 60;

export interface GuestIdentity {
  did: string;
  email?: string;
}

function secret(): string {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value) throw new Error("ADMIN_SESSION_SECRET is missing — add it to .env.local");
  return value;
}

function sign(payloadB64: string): string {
  return createHmac("sha256", `guest:${secret()}`).update(payloadB64).digest("hex");
}

function encode(identity: GuestIdentity): string {
  const payloadB64 = Buffer.from(JSON.stringify(identity)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

function decode(token: string | undefined): GuestIdentity | null {
  if (!token) return null;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(sign(payloadB64));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const value = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as GuestIdentity;
    return typeof value.did === "string" ? value : null;
  } catch {
    return null;
  }
}

export async function getGuest(): Promise<GuestIdentity | null> {
  const cookieStore = await cookies();
  return decode(cookieStore.get(GUEST_COOKIE)?.value);
}

export function newDeviceId(): string {
  return randomBytes(16).toString("base64url");
}

/** Route handlers only (cookies can't be set while rendering). */
export async function setGuest(identity: GuestIdentity, remember: boolean) {
  const cookieStore = await cookies();
  cookieStore.set(GUEST_COOKIE, encode(identity), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: REMEMBER_SECONDS } : {}),
  });
}
