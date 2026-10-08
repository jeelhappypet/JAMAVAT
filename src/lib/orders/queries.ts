import { Order } from "@/models/Order";
import { getBusinessDate } from "@/lib/utils/businessDate";
import { serializeOrder, type OrderLean } from "./serialize";

/** The counter keeps showing a finished order for this long, so it can call the token / carry it out. */
export const RECENTLY_READY_MS = 30 * 60 * 1000;

/** Counter queue — everything still cooking, plus what the kitchens finished in the last half hour. */
export async function getCounterOrders() {
  const businessDate = getBusinessDate();
  const orders = await Order.find({
    businessDate,
    $or: [{ status: "PENDING" }, { status: { $in: ["READY", "COMPLETED"] }, readyAt: { $gte: new Date(Date.now() - RECENTLY_READY_MS) } }],
  })
    .sort({ createdAt: 1 })
    .lean<OrderLean[]>();
  return orders.map(serializeOrder);
}
