export const MENU_CATEGORIES = ["શાક", "રોટલી", "મીઠાઈ", "અન્ય"] as const;
export type MenuCategory = (typeof MENU_CATEGORIES)[number];

export const ORDER_STATUSES = ["PENDING", "READY", "COMPLETED", "CANCELLED"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

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
