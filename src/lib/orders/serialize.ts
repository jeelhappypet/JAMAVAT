import type { OrderDTO, OrderItemDTO, OrderItemStatus, OrderStatus } from "@/types";

export interface OrderItemLean {
  menuItemId: unknown;
  nameSnapshot: string;
  nameGuSnapshot?: string;
  categoryId?: unknown;
  categorySnapshot: string;
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
  acceptedAt?: Date;
  readyAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  rejectedAt?: Date;
}

/** v1 orders have no per-item status — it follows the order's own status. */
export function itemStatus(item: OrderItemLean, orderStatus: string): OrderItemStatus {
  if (item.status === "READY" || item.status === "PENDING") return item.status;
  return orderStatus === "PENDING" || orderStatus === "PLACED" ? "PENDING" : "READY";
}

export function serializeOrderItem(item: OrderItemLean, orderStatus: string): OrderItemDTO {
  return {
    menuItemId: String(item.menuItemId),
    nameSnapshot: item.nameSnapshot,
    nameGuSnapshot: item.nameGuSnapshot || undefined,
    categoryId: item.categoryId ? String(item.categoryId) : undefined,
    categorySnapshot: item.categorySnapshot,
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
    acceptedAt: doc.acceptedAt?.toISOString(),
    readyAt: doc.readyAt?.toISOString(),
    completedAt: doc.completedAt?.toISOString(),
    cancelledAt: doc.cancelledAt?.toISOString(),
    rejectedAt: doc.rejectedAt?.toISOString(),
  };
}
