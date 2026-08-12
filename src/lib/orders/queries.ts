import { Order } from "@/models/Order";
import { getBusinessDate } from "@/lib/utils/businessDate";
import { serializeOrder } from "./serialize";

/** Kitchen queue — only orders not yet marked ready. */
export async function getKitchenOrders() {
  const businessDate = getBusinessDate();
  const orders = await Order.find({ businessDate, status: "PENDING" })
    .sort({ createdAt: 1 })
    .lean();
  return orders.map(serializeOrder);
}

/**
 * Counter queue — everything not yet finalized (still cooking or ready to
 * serve). An order only leaves this list when the counter itself completes
 * or cancels it; the kitchen marking it ready must never remove it here.
 */
export async function getCounterOrders() {
  const businessDate = getBusinessDate();
  const orders = await Order.find({ businessDate, status: { $in: ["PENDING", "READY"] } })
    .sort({ createdAt: 1 })
    .lean();
  return orders.map(serializeOrder);
}
