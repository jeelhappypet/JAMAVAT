/**
 * The four hardcoded categories v1 shipped with. Kept only so old menu items
 * and orders (which store one of these strings) can be migrated onto the
 * dynamic Menu → Category structure — new code never offers them as choices.
 */
export const LEGACY_MENU_CATEGORIES = ["શાક", "રોટલી", "મીઠાઈ", "અન્ય"] as const;

export const ORDER_STATUSES = ["PENDING", "READY", "COMPLETED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Per-item kitchen status: each kitchen marks only its own items ready. */
export const ORDER_ITEM_STATUSES = ["PENDING", "READY"] as const;
export type OrderItemStatus = (typeof ORDER_ITEM_STATUSES)[number];

export const STAFF_ROLES = ["ADMIN", "COUNTER", "KITCHEN"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** The logged-in staff member, as resolved from the session cookie + DB. */
export interface StaffSession {
  id: string;
  name: string;
  role: StaffRole;
}

export interface StaffDTO {
  id: string;
  name: string;
  role: StaffRole;
  isActive: boolean;
  isLocked: boolean;
  /** Categories this kitchen login receives (ignored for admin/counter, who see everything). */
  categoryIds: string[];
}

/** What the login screen needs to show a staff picker — never the PIN hash. */
export interface StaffLoginOption {
  id: string;
  name: string;
  role: StaffRole;
}

export interface MenuItemDTO {
  id: string;
  categoryId: string;
  name: string;
  nameGu?: string;
  price: number;
  isVeg: boolean;
  /** Hidden from ordering entirely (admin's choice). */
  isActive: boolean;
  /** Sold out for now — kitchen can flip this during service. */
  isAvailable: boolean;
}

export interface CategoryDTO {
  id: string;
  menuId: string;
  name: string;
  nameGu?: string;
  isActive: boolean;
  items: MenuItemDTO[];
}

export interface MenuDTO {
  id: string;
  name: string;
  nameGu?: string;
  isActive: boolean;
  categories: CategoryDTO[];
}

export interface OrderItemDTO {
  menuItemId: string;
  nameSnapshot: string;
  nameGuSnapshot?: string;
  /** Absent on v1 orders, which predate category routing — those show on every kitchen screen. */
  categoryId?: string;
  categorySnapshot: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  status: OrderItemStatus;
}

export interface DateWiseStat {
  businessDate: string;
  orders: number;
  completed: number;
  cancelled: number;
  revenue: number;
}

export interface DeveloperStats {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  todayOrders: number;
  todayRevenue: number;
  dateWise: DateWiseStat[];
}

export interface OrderDTO {
  id: string;
  tokenNumber: number;
  businessDate: string;
  customerName?: string;
  items: OrderItemDTO[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  readyAt?: string;
  completedAt?: string;
  cancelledAt?: string;
}

/** One order as a kitchen screen sees it: only that screen's items that still need cooking. */
export interface KitchenTicketDTO {
  orderId: string;
  tokenNumber: number;
  customerName?: string;
  createdAt: string;
  items: OrderItemDTO[];
  /** Items of the same order still cooking on other kitchen screens. */
  otherPendingCount: number;
}

export interface KitchenScopeDTO {
  /** Admin sees every kitchen's items. */
  all: boolean;
  categories: { id: string; name: string; nameGu?: string; menuName: string; menuNameGu?: string }[];
}
