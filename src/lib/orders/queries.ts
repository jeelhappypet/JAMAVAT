import { Order } from "@/models/Order";
import { connectToDatabase } from "@/lib/db/mongodb";
import { getBusinessDate } from "@/lib/utils/businessDate";
import type { RestaurantRef } from "@/lib/db/tenant";
import { ORDER_FIELDS, serializeOrder, type OrderLean } from "./serialize";

/** The counter keeps showing a finished order for this long, so it can call the token / carry it out. */
export const RECENTLY_READY_MS = 30 * 60 * 1000;

/** Counter queue — everything still cooking, plus what the kitchens finished in the last half hour. */
export async function getCounterOrders(restaurantId: RestaurantRef) {
  // Connects itself: a page renders this directly, not only the API route.
  await connectToDatabase();
  const businessDate = getBusinessDate();
  const orders = await Order.find({
    restaurantId,
    businessDate,
    $or: [{ status: "PENDING" }, { status: { $in: ["READY", "COMPLETED"] }, readyAt: { $gte: new Date(Date.now() - RECENTLY_READY_MS) } }],
  })
    .select(ORDER_FIELDS)
    .sort({ createdAt: 1 })
    .lean<OrderLean[]>();
  return orders.map(serializeOrder);
}
