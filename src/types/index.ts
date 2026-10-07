/**
 * The four hardcoded categories v1 shipped with. Kept only so old menu items
 * and orders (which store one of these strings) can be migrated onto the
 * dynamic Menu → Category structure — new code never offers them as choices.
 */
export const LEGACY_MENU_CATEGORIES = ["શાક", "રોટલી", "મીઠાઈ", "અન્ય"] as const;

/** PLACED = a guest's QR order waiting for the counter to accept (or REJECT) it; kitchens never see it. */
export const ORDER_STATUSES = ["PLACED", "PENDING", "READY", "COMPLETED", "CANCELLED", "REJECTED"] as const;
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

export const ORDER_SOURCES = ["COUNTER", "QR"] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

export interface OrderDTO {
  id: string;
  tokenNumber: number;
  businessDate: string;
  source: OrderSource;
  /** QR orders: the seat it came from ("4A"). */
  seatCode?: string;
  guestEmail?: string;
  /** Guest's cooking note ("less spicy"). */
  note?: string;
  customerName?: string;
  items: OrderItemDTO[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  acceptedAt?: string;
  readyAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  rejectedAt?: string;
}

/** One order as a kitchen screen sees it: only that screen's items that still need cooking. */
export interface KitchenTicketDTO {
  orderId: string;
  tokenNumber: number;
  customerName?: string;
  seatCode?: string;
  note?: string;
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

export interface SeatDTO {
  id: string;
  tableId: string;
  label: string;
  /** "4A" — what's printed on the sticker and shown everywhere. */
  code: string;
  token: string;
  isActive: boolean;
  /** Present while a guest holds this QR. */
  session?: { id: string; email: string; openedAt: string; orderCount: number; total: number };
}

export interface TableDTO {
  id: string;
  name: string;
  area?: string;
  isActive: boolean;
  seats: SeatDTO[];
}

/** free: nobody holds the QR · mine: this device does · taken: another guest does. */
export type SeatLock = "free" | "mine" | "taken";

export interface GuestStateDTO {
  seatCode: string;
  area?: string;
  verifiedEmail?: string;
  lock: SeatLock;
  /** This device's orders in its current sitting (only when lock is "mine"). */
  orders: OrderDTO[];
}
