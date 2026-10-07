import { Order } from "@/models/Order";
import { getBusinessDate } from "@/lib/utils/businessDate";
import { serializeOrder, type OrderLean } from "./serialize";

/**
 * Counter queue — QR orders waiting to be accepted plus everything still
 * cooking or ready to serve. An order only leaves this list when the
 * counter itself accepts/rejects, completes or cancels it; kitchens marking
 * it ready must never remove it here.
 */
export async function getCounterOrders() {
  const businessDate = getBusinessDate();
  const orders = await Order.find({ businessDate, status: { $in: ["PLACED", "PENDING", "READY"] } })
    .sort({ createdAt: 1 })
    .lean<OrderLean[]>();
  return orders.map(serializeOrder);
}
