import type { RestaurantInfo } from "@/lib/restaurant";
import type { SubscriptionState } from "@/types";

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * What a restaurant's subscription allows right now. HQ's `status` decides
 * first; a TRIAL or ACTIVE restaurant then depends on `paidUntil`:
 * inside it → ok, past it but within the grace days → due (everything still
 * works, the admin sees a banner), past that → expired.
 *
 * No `paidUntil` means no end date (the owner's own restaurant).
 */
export function subscriptionState(restaurant: Pick<RestaurantInfo, "status" | "paidUntil" | "graceDays">, now = Date.now()): SubscriptionState {
  if (restaurant.status === "SUSPENDED") return "suspended";
  if (restaurant.status === "CANCELLED") return "cancelled";
  if (!restaurant.paidUntil) return "ok";
  const ends = restaurant.paidUntil.getTime();
  if (now <= ends) return "ok";
  return now <= ends + (restaurant.graceDays ?? 0) * DAY_MS ? "due" : "expired";
}

/** Taking new orders (counter, QR and kitchen work) — settling a bill that's already open never stops. */
export function canTakeOrders(state: SubscriptionState): boolean {
  return state === "ok" || state === "due";
}

/** Staff can still open the app (to settle and read reports) unless HQ switched the restaurant off. */
export function canStaffSignIn(state: SubscriptionState): boolean {
  return state !== "suspended" && state !== "cancelled";
}

/** Days left before `paidUntil` — negative once it has passed. Null when there's no end date. */
export function daysLeft(paidUntil: Date | undefined, now = Date.now()): number | null {
  if (!paidUntil) return null;
  return Math.ceil((paidUntil.getTime() - now) / DAY_MS);
}

/** The admin banner starts this many days before the period ends. */
export const RENEWAL_NOTICE_DAYS = 7;

/** `paidUntil` after a payment: from today, or from the current end if it hasn't passed yet. */
export function extendPaidUntil(current: Date | undefined, months: number, now = new Date()): Date {
  const from = current && current.getTime() > now.getTime() ? new Date(current) : new Date(now);
  const day = from.getUTCDate();
  const extended = new Date(from);
  extended.setUTCMonth(extended.getUTCMonth() + months);
  // 31 Jan + 1 month must not roll into March.
  if (extended.getUTCDate() < day) extended.setUTCDate(0);
  return extended;
}
