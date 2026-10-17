import { connectToDatabase } from "@/lib/db/mongodb";
import { Plan, type PlanDocument } from "@/models/Plan";
import { Restaurant, type RestaurantDocument } from "@/models/Restaurant";
import { Seat } from "@/models/Seat";
import { Staff } from "@/models/Staff";
import { Order } from "@/models/Order";
import { getBusinessDate } from "@/lib/utils/businessDate";
import { daysLeft, subscriptionState } from "@/lib/subscription";
import type { BillingCycle, HqRestaurantDTO, RestaurantStatus } from "@/types";

/**
 * HQ's view of the restaurants. The per-restaurant counts come from three
 * grouped queries over all of them rather than three per restaurant, so the
 * list costs the same whether there are two customers or two hundred. These
 * are the only reads in the app that deliberately cross restaurants.
 */
export async function listRestaurants(): Promise<HqRestaurantDTO[]> {
  await connectToDatabase();
  const businessDate = getBusinessDate();

  const [restaurants, plans, seats, staff, orders] = await Promise.all([
    Restaurant.find().sort({ createdAt: -1 }).lean<RestaurantDocument[]>(),
    Plan.find().select({ name: 1 }).lean<PlanDocument[]>(),
    Seat.aggregate<{ _id: unknown; count: number }>([{ $match: { isActive: true } }, { $group: { _id: "$restaurantId", count: { $sum: 1 } } }]).option({
      crossTenant: true,
    }),
    Staff.aggregate<{ _id: unknown; count: number }>([{ $match: { isActive: true } }, { $group: { _id: "$restaurantId", count: { $sum: 1 } } }]).option({
      crossTenant: true,
    }),
    Order.aggregate<{ _id: unknown; count: number }>([
      { $match: { businessDate, status: { $ne: "CANCELLED" } } },
      { $group: { _id: "$restaurantId", count: { $sum: 1 } } },
    ]).option({ crossTenant: true }),
  ]);

  const planName = new Map(plans.map((plan) => [String(plan._id), plan.name?.en || ""]));
  const count = (rows: { _id: unknown; count: number }[]) => new Map(rows.map((row) => [String(row._id), row.count]));
  const seatCount = count(seats);
  const staffCount = count(staff);
  const orderCount = count(orders);

  return restaurants.map((restaurant) => toHqRestaurant(restaurant, { planName, seatCount, staffCount, orderCount }));
}

export async function getRestaurantForHq(id: string): Promise<HqRestaurantDTO | null> {
  await connectToDatabase();
  const restaurant = await Restaurant.findById(id).lean<RestaurantDocument>();
  if (!restaurant) return null;

  const [plan, seats, staff, ordersToday] = await Promise.all([
    restaurant.planId ? Plan.findById(restaurant.planId).select({ name: 1 }).lean<PlanDocument>() : null,
    Seat.countDocuments({ restaurantId: id, isActive: true }),
    Staff.countDocuments({ restaurantId: id, isActive: true }),
    Order.countDocuments({ restaurantId: id, businessDate: getBusinessDate(), status: { $ne: "CANCELLED" } }),
  ]);

  return toHqRestaurant(restaurant, {
    planName: new Map(plan ? [[String(plan._id), plan.name?.en || ""]] : []),
    seatCount: new Map([[id, seats]]),
    staffCount: new Map([[id, staff]]),
    orderCount: new Map([[id, ordersToday]]),
  });
}

function toHqRestaurant(
  restaurant: RestaurantDocument,
  totals: { planName: Map<string, string>; seatCount: Map<string, number>; staffCount: Map<string, number>; orderCount: Map<string, number> }
): HqRestaurantDTO {
  const id = String(restaurant._id);
  const status = (restaurant.status ?? "ACTIVE") as RestaurantStatus;
  const paidUntil = restaurant.paidUntil ?? undefined;
  const graceDays = restaurant.graceDays ?? 7;
  const staffCount = totals.staffCount.get(id) ?? 0;

  return {
    id,
    name: restaurant.name,
    slug: restaurant.slug,
    status,
    state: subscriptionState({ status, paidUntil, graceDays }),
    planId: restaurant.planId ? String(restaurant.planId) : undefined,
    planName: restaurant.planId ? totals.planName.get(String(restaurant.planId)) || undefined : undefined,
    billingCycle: (restaurant.billingCycle ?? "MONTHLY") as BillingCycle,
    paidUntil: paidUntil?.toISOString(),
    graceDays,
    daysLeft: daysLeft(paidUntil) ?? undefined,
    ownerName: restaurant.ownerName || undefined,
    ownerEmail: restaurant.ownerEmail || undefined,
    ownerPhone: restaurant.ownerPhone || undefined,
    city: restaurant.city || undefined,
    notes: restaurant.notes || undefined,
    inviteePending: Boolean(restaurant.invite?.tokenHash && staffCount === 0),
    hasStaff: staffCount > 0,
    counts: { seats: totals.seatCount.get(id) ?? 0, staff: staffCount, ordersToday: totals.orderCount.get(id) ?? 0 },
    createdAt: restaurant.createdAt.toISOString(),
  };
}

/** Turns a wanted link into a free one: "kirans-thali", then "-2", "-3"… */
export async function freeSlug(wanted: string): Promise<string> {
  await connectToDatabase();
  for (let suffix = 0; suffix < 50; suffix += 1) {
    const candidate = suffix === 0 ? wanted : `${wanted}-${suffix + 1}`;
    if (!(await Restaurant.exists({ $or: [{ slug: candidate }, { previousSlugs: candidate }] }))) return candidate;
  }
  return `${wanted}-${Date.now().toString(36)}`;
}
