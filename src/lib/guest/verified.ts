import { GuestSession } from "@/models/GuestSession";
import type { GuestIdentity } from "@/lib/guest/session";

/** A verification that never led to an order expires on its own after this long. */
const VERIFIED_FOR_MS = 6 * 60 * 60 * 1000;

/**
 * The guest's verified email — but only for the sitting it was verified
 * for. Once a sitting of this phone is settled or freed after the OTP, the
 * next order needs a fresh OTP, so the next person to use the phone (or a
 * guest coming back later) never inherits the previous email.
 */
export async function verifiedEmail(guest: GuestIdentity | null): Promise<string | undefined> {
  if (!guest?.email || !guest.vt) return undefined;
  const open = await GuestSession.exists({ deviceId: guest.did, status: "OPEN" });
  if (open) return guest.email;
  if (Date.now() - guest.vt > VERIFIED_FOR_MS) return undefined;
  const closedSince = await GuestSession.exists({ deviceId: guest.did, status: "CLOSED", closedAt: { $gt: new Date(guest.vt) } });
  return closedSince ? undefined : guest.email;
}
