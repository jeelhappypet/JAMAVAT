import { connectToDatabase } from "@/lib/db/mongodb";
import type { RestaurantRef } from "@/lib/db/tenant";
import { Plan, type PlanDocument } from "@/models/Plan";
import { Seat } from "@/models/Seat";
import { Staff } from "@/models/Staff";
import { getRestaurantInfo } from "@/lib/restaurant";

export interface PlanLimits {
  maxSeats?: number;
  maxStaff?: number;
  whatsapp: boolean;
}

/** No plan (the owner's own restaurant, or one HQ hasn't assigned yet) means no limits. */
const UNLIMITED: PlanLimits = { whatsapp: true };

const TTL_MS = 60_000;
const memo = new Map<string, { at: number; value: PlanLimits }>();

export async function planLimits(restaurantId: RestaurantRef): Promise<PlanLimits> {
  const key = String(restaurantId);
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const restaurant = await getRestaurantInfo(restaurantId);
  let value = UNLIMITED;
  if (restaurant?.planId) {
    const plan = await Plan.findById(restaurant.planId).select({ maxSeats: 1, maxStaff: 1, whatsapp: 1 }).lean<PlanDocument>();
    if (plan) value = { maxSeats: plan.maxSeats ?? undefined, maxStaff: plan.maxStaff ?? undefined, whatsapp: plan.whatsapp === true };
  }
  memo.set(key, { at: Date.now(), value });
  return value;
}

export function forgetPlanLimits(restaurantId: RestaurantRef) {
  memo.delete(String(restaurantId));
}

export type Budget = { ok: true } | { ok: false; max: number; used: number };

/**
 * Room for `adding` more QR codes on the restaurant's plan. Only **active**
 * seats count, so hiding a QR frees a slot; a plan that's already over its
 * limit (HQ moved the restaurant down a plan) keeps what exists and just
 * refuses new ones.
 */
export async function seatBudget(restaurantId: RestaurantRef, adding: number): Promise<Budget> {
  const { maxSeats } = await planLimits(restaurantId);
  if (maxSeats === undefined) return { ok: true };
  await connectToDatabase();
  const used = await Seat.countDocuments({ restaurantId, isActive: true });
  return used + adding <= maxSeats ? { ok: true } : { ok: false, max: maxSeats, used };
}

/** Same for staff logins. */
export async function staffBudget(restaurantId: RestaurantRef, adding: number): Promise<Budget> {
  const { maxStaff } = await planLimits(restaurantId);
  if (maxStaff === undefined) return { ok: true };
  await connectToDatabase();
  const used = await Staff.countDocuments({ restaurantId, isActive: true });
  return used + adding <= maxStaff ? { ok: true } : { ok: false, max: maxStaff, used };
}
