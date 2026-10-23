import type { OrderDTO, OrderItemDTO, OrderItemStatus, OrderStatus } from "@/types";

export interface OrderItemLean {
  menuItemId: unknown;
  nameSnapshot: string;
  nameGuSnapshot?: string;
  categoryId?: unknown;
  categorySnapshot: string;
  kitchenSnapshot?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  status?: string;
}

export interface OrderLean {
  _id: unknown;
  tokenNumber: number;
  businessDate: string;
  source?: string;
  seatCode?: string;
  guestEmail?: string;
  note?: string;
  customerName?: string;
  items: OrderItemLean[];
  totalAmount: number;
  status: string;
  createdAt: Date;
  readyAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

/**
 * The fields `serializeOrder` reads, and no others: `seatId`,
 * `guestSessionId`, `clientRequestId`, `paymentMode` and each item's
 * `readyAt` never reach a screen, and this is the call every counter and
 * kitchen screen repeats all day. Every query whose rows go through
 * `serializeOrder` selects these — keep the two lists together.
 */
export const ORDER_FIELDS = {
  tokenNumber: 1,
  businessDate: 1,
  source: 1,
  seatCode: 1,
  guestEmail: 1,
  note: 1,
  customerName: 1,
  totalAmount: 1,
  status: 1,
  createdAt: 1,
  readyAt: 1,
  completedAt: 1,
  cancelledAt: 1,
  "items.menuItemId": 1,
  "items.nameSnapshot": 1,
  "items.nameGuSnapshot": 1,
  "items.categoryId": 1,
  "items.categorySnapshot": 1,
  "items.kitchenSnapshot": 1,
  "items.quantity": 1,
  "items.unitPrice": 1,
  "items.lineTotal": 1,
  "items.status": 1,
};

/** v1 orders have no per-item status — it follows the order's own status. */
export function itemStatus(item: OrderItemLean, orderStatus: string): OrderItemStatus {
  if (item.status === "READY" || item.status === "PENDING") return item.status;
  return orderStatus === "PENDING" ? "PENDING" : "READY";
}

export function serializeOrderItem(item: OrderItemLean, orderStatus: string): OrderItemDTO {
  return {
    menuItemId: String(item.menuItemId),
    nameSnapshot: item.nameSnapshot,
    nameGuSnapshot: item.nameGuSnapshot || undefined,
    categoryId: item.categoryId ? String(item.categoryId) : undefined,
    categorySnapshot: item.categorySnapshot,
    kitchenSnapshot: item.kitchenSnapshot || undefined,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    status: itemStatus(item, orderStatus),
  };
}

export function serializeOrder(doc: OrderLean): OrderDTO {
  return {
    id: String(doc._id),
    tokenNumber: doc.tokenNumber,
    businessDate: doc.businessDate,
    source: doc.source === "QR" ? "QR" : "COUNTER",
    seatCode: doc.seatCode || undefined,
    guestEmail: doc.guestEmail || undefined,
    note: doc.note || undefined,
    customerName: doc.customerName || undefined,
    items: doc.items.map((item) => serializeOrderItem(item, doc.status)),
    totalAmount: doc.totalAmount,
    status: doc.status as OrderStatus,
    createdAt: doc.createdAt.toISOString(),
    readyAt: doc.readyAt?.toISOString(),
    completedAt: doc.completedAt?.toISOString(),
    cancelledAt: doc.cancelledAt?.toISOString(),
  };
}
