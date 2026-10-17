import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { cache } from "react";

/**
 * HQ is the Jamavat owner's own panel — a different thing from a
 * restaurant's staff login, so it gets its own cookie and its own rules:
 * the address must be on the `HQ_EMAILS` allowlist, and it signs in with an
 * emailed code (no PIN to shoulder-surf, no password to leak).
 */
export const HQ_COOKIE = "jamavat_hq_session";

/** HQ sees every restaurant's data, so a lost laptop shouldn't stay signed in for a year. */
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export const HQ_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

interface HqPayload {
  email: string;
  iat: number;
}

function secret(): string {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value) throw new Error("ADMIN_SESSION_SECRET is missing — add it to .env.local");
  return value;
}

function sign(payloadB64: string): string {
  return createHmac("sha256", `hq:${secret()}`).update(payloadB64).digest("hex");
}

/** The addresses allowed into HQ. With none set, HQ is closed — never open to everyone. */
export function hqEmails(): string[] {
  return (process.env.HQ_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isHqEmail(email: string): boolean {
  return hqEmails().includes(email.trim().toLowerCase());
}

export function createHqToken(email: string): string {
  const payload: HqPayload = { email: email.toLowerCase(), iat: Date.now() };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

/**
 * The signed-in HQ address, or null. The allowlist is checked again on every
 * request, so removing an address from `HQ_EMAILS` locks that laptop out at
 * once instead of when its cookie happens to expire.
 */
export const getHqEmail = cache(async (): Promise<string | null> => {
  const token = (await cookies()).get(HQ_COOKIE)?.value;
  if (!token) return null;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;
  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(sign(payloadB64));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as HqPayload;
    if (typeof payload.email !== "string" || typeof payload.iat !== "number") return null;
    if (Date.now() - payload.iat > MAX_AGE_SECONDS * 1000) return null;
    return isHqEmail(payload.email) ? payload.email : null;
  } catch {
    return null;
  }
});

export async function startHqSession(email: string) {
  (await cookies()).set(HQ_COOKIE, createHqToken(email), HQ_COOKIE_OPTIONS);
}

export async function endHqSession() {
  (await cookies()).delete(HQ_COOKIE);
}
