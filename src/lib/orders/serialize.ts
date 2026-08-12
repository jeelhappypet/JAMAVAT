import type { OrderDTO, OrderItemDTO } from "@/types";

interface OrderLean {
  _id: unknown;
  tokenNumber: number;
  businessDate: string;
  customerName?: string;
  items: Array<{
    menuItemId: unknown;
    nameSnapshot: string;
    categorySnapshot: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  totalAmount: number;
  status: string;
  createdAt: Date;
  readyAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

export function serializeOrder(doc: OrderLean): OrderDTO {
  return {
    id: String(doc._id),
    tokenNumber: doc.tokenNumber,
    businessDate: doc.businessDate,
    customerName: doc.customerName || undefined,
    items: doc.items.map(
      (item): OrderItemDTO => ({
        menuItemId: String(item.menuItemId),
        nameSnapshot: item.nameSnapshot,
        categorySnapshot: item.categorySnapshot as OrderItemDTO["categorySnapshot"],
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })
    ),
    totalAmount: doc.totalAmount,
    status: doc.status as OrderDTO["status"],
    createdAt: doc.createdAt.toISOString(),
    readyAt: doc.readyAt?.toISOString(),
    completedAt: doc.completedAt?.toISOString(),
    cancelledAt: doc.cancelledAt?.toISOString(),
  };
}
