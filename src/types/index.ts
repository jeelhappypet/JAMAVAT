export const MENU_CATEGORIES = ["શાક", "રોટલી", "મીઠાઈ", "અન્ય"] as const;
export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export const ORDER_STATUSES = ["PENDING", "READY", "COMPLETED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

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
}

/** What the login screen needs to show a staff picker — never the PIN hash. */
export interface StaffLoginOption {
  id: string;
  name: string;
  role: StaffRole;
}

export interface MenuItemDTO {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  isActive: boolean;
}

export interface OrderItemDTO {
  menuItemId: string;
  nameSnapshot: string;
  categorySnapshot: MenuCategory;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
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
