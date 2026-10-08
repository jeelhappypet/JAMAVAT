/**
 * The four hardcoded categories v1 shipped with. Kept only so old menu items
 * and orders (which store one of these strings) can be migrated onto the
 * dynamic Menu → Category structure — new code never offers them as choices.
 */
export const LEGACY_MENU_CATEGORIES = ["શાક", "રોટલી", "મીઠાઈ", "અન્ય"] as const;

/** QR and counter orders alike go straight to the kitchens as PENDING. COMPLETED = served (or settled). */
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
  /** A kitchen login whose categories all sit in one menu shows as "Gujarati kitchen". */
  station?: { name: string; nameGu?: string };
}

export interface MenuItemDTO {
  id: string;
  categoryId: string;
  name: string;
  nameGu?: string;
  description?: string;
  descriptionGu?: string;
  isBestseller: boolean;
  /** Dish photo (Vercel Blob). Missing = no photo box on the guest menu. */
  imageUrl?: string;
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
  readyAt?: string;
  completedAt?: string;
  cancelledAt?: string;
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
  session?: SeatSessionDTO;
}

/** eating: guest seated, food cooking or eaten · new: an order came in during the last few minutes. */
export type SeatState = "eating" | "new";

export interface SeatSessionDTO {
  id: string;
  email?: string;
  openedAt: string;
  orderCount: number;
  total: number;
  state: SeatState;
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
  /** The other sides of this table ("4B") — the "already in use" screen points to them. */
  otherSeats: string[];
  /** This device's last sitting here just ended: settled (paid) or freed by the counter. No details on purpose. */
  ended?: { reason: "SETTLED" | "FREED" };
}

export const PAYMENT_MODES = ["CASH", "UPI", "CARD"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export interface BillLineDTO {
  name: string;
  nameGu?: string;
  quantity: number;
  amount: number;
}

export interface BillDTO {
  id: string;
  billNo: number;
  seatCode: string;
  email?: string;
  lines: BillLineDTO[];
  itemsTotal: number;
  discount: number;
  total: number;
  paymentMode: PaymentMode;
  settledAt: string;
  emailStatus: "SENT" | "FAILED" | "SKIPPED";
}

/** Everything the counter's seat page (settle bill) needs. */
export interface SeatDetailDTO {
  seat: { id: string; code: string; label: string; tableName: string; area?: string };
  session?: { id: string; email?: string; openedAt: string };
  orders: OrderDTO[];
  /** categoryId → its menu ("Gujarati"), i.e. the kitchen column of the bill. */
  kitchens: Record<string, { name: string; nameGu?: string }>;
}

export const REPORT_RANGES = ["today", "yesterday", "week", "month"] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];

export interface ReportKpi {
  value: number;
  /** Same figure for the previous period of equal length (yesterday, the week before…). */
  previous: number;
}

export interface TodayReportDTO {
  range: ReportRange;
  from: string;
  to: string;
  sales: ReportKpi;
  orders: ReportKpi & { dineIn: number; parcel: number };
  averageBill: ReportKpi;
  cancelled: ReportKpi;
  /** Orders per hour of day (0–23, Asia/Kolkata). */
  byHour: number[];
  /** How many menus the restaurant has — "Sales by menu" only shows with two or more. */
  menuCount: number;
  byMenu: { name: string; nameGu?: string; amount: number }[];
  byPayment: { mode: PaymentMode | "PARCEL"; amount: number }[];
  topDishes: { name: string; nameGu?: string; menu?: string; menuGu?: string; quantity: number; amount: number }[];
  lastDays: { date: string; orders: number; sales: number; cancelled: number }[];
}

export interface MonthReportDTO {
  month: string;
  sales: number;
  orders: number;
  dineIn: number;
  parcel: number;
  cancelled: number;
  bills: number;
  days: { date: string; orders: number; dineIn: number; parcel: number; sales: number; cancelled: number }[];
}

export interface RestaurantSettingsDTO {
  name: string;
  address?: string;
  phone?: string;
  /** "Rate us on Google" link in the thank-you email. */
  reviewUrl?: string;
}

// ---- WhatsApp inbox (/whatsapp)

/** Inbound messages are "received"; outbound go accepted → sent → delivered → read, or failed. */
export const WHATSAPP_MESSAGE_STATUSES = ["received", "accepted", "sent", "delivered", "read", "failed"] as const;
export type WhatsAppMessageStatus = (typeof WHATSAPP_MESSAGE_STATUSES)[number];

export interface WhatsAppConversationDTO {
  id: string;
  customerId: string;
  customerName?: string;
  /** Digits only, e.g. "919876543210". */
  waId: string;
  status: "open" | "closed";
  lastMessage: string;
  lastMessageDirection?: "inbound" | "outbound";
  lastMessageAt?: string;
  /** Free-form replies are allowed until this time (24 h after the customer's last message). */
  replyWindowEndsAt?: string;
  unreadCount: number;
}

export interface WhatsAppMessageDTO {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  whatsappMessageId: string;
  messageType: string;
  text: string;
  status: WhatsAppMessageStatus;
  /** Why WhatsApp couldn't deliver it (failed only). */
  error?: { code?: number; title?: string; message?: string };
  sentBy?: string;
  timestamp: string;
}
