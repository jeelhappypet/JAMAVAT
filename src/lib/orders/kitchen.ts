import { Order } from "@/models/Order";
import { Staff, type StaffDocument } from "@/models/Staff";
import { Category, type CategoryDocument } from "@/models/Category";
import { Menu, type MenuDocument } from "@/models/Menu";
import { getBusinessDate } from "@/lib/utils/businessDate";
import { itemStatus, serializeOrderItem, type OrderItemLean, type OrderLean } from "./serialize";
import type { KitchenScopeDTO, KitchenTicketDTO, StaffSession } from "@/types";

/** Which order items a kitchen screen is responsible for. */
export interface KitchenScope {
  all: boolean;
  categoryIds: Set<string>;
}

/** Admins see every kitchen's items; a kitchen login sees the categories the admin assigned it. */
export async function getKitchenScope(staff: StaffSession): Promise<KitchenScope> {
  if (staff.role !== "KITCHEN") return { all: true, categoryIds: new Set() };
  const doc = await Staff.findById(staff.id).select({ categoryIds: 1 }).lean<Pick<StaffDocument, "categoryIds">>();
  return { all: false, categoryIds: new Set((doc?.categoryIds ?? []).map(String)) };
}

/** v1 items carry no category, so every kitchen gets them rather than none. */
export function isInScope(item: OrderItemLean, scope: KitchenScope): boolean {
  return scope.all || !item.categoryId || scope.categoryIds.has(String(item.categoryId));
}

/** Today's orders that still have something for this screen to cook, oldest first. */
export async function getKitchenTickets(scope: KitchenScope): Promise<KitchenTicketDTO[]> {
  const orders = await Order.find({ businessDate: getBusinessDate(), status: "PENDING" })
    .sort({ createdAt: 1 })
    .lean<OrderLean[]>();

  const tickets: KitchenTicketDTO[] = [];
  for (const order of orders) {
    const pending = order.items.filter((item) => itemStatus(item, order.status) === "PENDING");
    const mine = pending.filter((item) => isInScope(item, scope));
    if (mine.length === 0) continue;
    tickets.push({
      orderId: String(order._id),
      tokenNumber: order.tokenNumber,
      customerName: order.customerName || undefined,
      createdAt: order.createdAt.toISOString(),
      items: mine.map((item) => serializeOrderItem(item, order.status)),
      otherPendingCount: pending.length - mine.length,
    });
  }
  return tickets;
}

/** Category names for the kitchen header ("Showing: Thali · Shaak"). */
export async function describeKitchenScope(scope: KitchenScope): Promise<KitchenScopeDTO> {
  if (scope.all) return { all: true, categories: [] };
  const categories = await Category.find({ _id: { $in: [...scope.categoryIds] } })
    .sort({ sortOrder: 1 })
    .lean<CategoryDocument[]>();
  const menus = await Menu.find({ _id: { $in: categories.map((c) => c.menuId) } }).lean<MenuDocument[]>();
  const menuById = new Map(menus.map((m) => [String(m._id), m]));
  return {
    all: false,
    categories: categories.map((category) => {
      const menu = menuById.get(String(category.menuId));
      return {
        id: String(category._id),
        name: category.name,
        nameGu: category.nameGu || undefined,
        menuName: menu?.name ?? "",
        menuNameGu: menu?.nameGu || undefined,
      };
    }),
  };
}
