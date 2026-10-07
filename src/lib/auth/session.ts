import { createHmac, timingSafeEqual } from "crypto";
import { STAFF_ROLES, type StaffRole } from "@/types";

export const STAFF_SESSION_COOKIE = "jamavat_staff_session";

/**
 * Staff stay logged in until they log out. Browsers cap cookie lifetime at
 * ~400 days, so the proxy re-issues the cookie (same staff, fresh `iat`)
 * once it's older than SESSION_REFRESH_AFTER_MS — a device that's used at
 * least once a year never gets logged out on its own.
 */
const COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;
const SESSION_REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: COOKIE_MAX_AGE_SECONDS,
};

export interface SessionPayload {
  /** Staff _id */
  sid: string;
  /** Staff.sessionVersion at the time the cookie was issued */
  sv: number;
  /** Role at issue time — only used for optimistic redirects in the proxy; APIs re-read it from the DB. */
  role: StaffRole;
  /** Issued-at, ms */
  iat: number;
}

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is missing — add it to .env.local");
  }
  return secret;
}

function sign(payloadB64: string): string {
  return createHmac("sha256", getSecret()).update(payloadB64).digest("hex");
}

export function createSessionToken(session: Omit<SessionPayload, "iat">): string {
  const payload: SessionPayload = { ...session, iat: Date.now() };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

/**
 * Signature check only — no DB. Good enough for the proxy's redirects;
 * anything that reads or writes data must go through `getCurrentStaff()`,
 * which also checks the staff is still active and the sessionVersion matches.
 */
export function readSessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(sign(payloadB64));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString()) as SessionPayload;
    if (typeof payload.sid !== "string" || typeof payload.sv !== "number") return null;
    if (!STAFF_ROLES.includes(payload.role)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function shouldRefreshSession(session: SessionPayload): boolean {
  return Date.now() - session.iat > SESSION_REFRESH_AFTER_MS;
}

/**
 * First-run only: whoever creates the very first admin must know this key.
 * Falls back to the old ADMIN_PASSWORD so existing deployments keep working.
 */
export function verifySetupKey(key: string): boolean {
  const expected = process.env.SETUP_KEY || process.env.ADMIN_PASSWORD || "";
  if (!expected) return false;
  const a = Buffer.from(key);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
