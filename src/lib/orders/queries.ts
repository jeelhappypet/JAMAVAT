import { Order } from "@/models/Order";
import { getBusinessDate } from "@/lib/utils/businessDate";
import { serializeOrder } from "./serialize";

export async function getActiveOrders() {
  const businessDate = getBusinessDate();
  const orders = await Order.find({ businessDate, status: "PENDING" })
    .sort({ createdAt: 1 })
    .lean();
  return orders.map(serializeOrder);
}
