import { connectToDatabase } from "@/lib/db/mongodb";
import { Order } from "@/models/Order";
import { Bill, type BillDocument } from "@/models/Bill";
import { Category, type CategoryDocument } from "@/models/Category";
import { Menu, type MenuDocument } from "@/models/Menu";
import { getBusinessDate } from "@/lib/utils/businessDate";
import type { OrderLean } from "@/lib/orders/serialize";
import type { MonthReportDTO, PaymentMode, ReportRange, TodayReportDTO } from "@/types";

type ReportOrder = OrderLean & { guestSessionId?: unknown; paymentMode?: PaymentMode };
type ReportBill = Pick<BillDocument, "businessDate" | "total" | "paymentMode" | "orderIds">;

/** YYYY-MM-DD ± days, calendar-correct (business dates are already Asia/Kolkata). */
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = shiftDate(day, 1)) days.push(day);
  return days;
}

const hourFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hourCycle: "h23" });

/** [from, to] for a range, and the period of the same length just before it (for "vs yesterday"). */
export function rangeDates(range: ReportRange, today = getBusinessDate()) {
  if (range === "yesterday") {
    const y = shiftDate(today, -1);
    return { from: y, to: y, prevFrom: shiftDate(y, -1), prevTo: shiftDate(y, -1) };
  }
  if (range === "week") {
    return { from: shiftDate(today, -6), to: today, prevFrom: shiftDate(today, -13), prevTo: shiftDate(today, -7) };
  }
  if (range === "month") {
    const from = `${today.slice(0, 8)}01`;
    const dayOfMonth = Number(today.slice(8));
    const prevFrom = `${shiftDate(from, -1).slice(0, 8)}01`;
    const prevMonthEnd = shiftDate(from, -1);
    const prevTo = shiftDate(prevFrom, Math.min(dayOfMonth, Number(prevMonthEnd.slice(8))) - 1);
    return { from, to: today, prevFrom, prevTo };
  }
  return { from: today, to: today, prevFrom: shiftDate(today, -1), prevTo: shiftDate(today, -1) };
}

/** Only the fields reports read — a month of orders stays small on the wire. */
const ORDER_FIELDS = {
  businessDate: 1,
  status: 1,
  totalAmount: 1,
  guestSessionId: 1,
  paymentMode: 1,
  createdAt: 1,
  "items.menuItemId": 1,
  "items.nameSnapshot": 1,
  "items.nameGuSnapshot": 1,
  "items.categoryId": 1,
  "items.quantity": 1,
  "items.lineTotal": 1,
};

/** One round trip for a whole date span; callers slice it per period in memory. */
async function loadPeriod(from: string, to: string) {
  const [orders, bills] = await Promise.all([
    Order.find({ businessDate: { $gte: from, $lte: to } }).select(ORDER_FIELDS).lean<ReportOrder[]>(),
    Bill.find({ businessDate: { $gte: from, $lte: to } }).select({ businessDate: 1, total: 1, paymentMode: 1, orderIds: 1 }).lean<ReportBill[]>(),
  ]);
  return { orders, bills };
}

function slice(data: Awaited<ReturnType<typeof loadPeriod>>, from: string, to: string) {
  const inRange = (date: string) => date >= from && date <= to;
  return { orders: data.orders.filter((order) => inRange(order.businessDate)), bills: data.bills.filter((bill) => inRange(bill.businessDate)) };
}

/**
 * Sales = settled dine-in bills (after discount) + parcel orders (paid when
 * ordering). Dine-in orders still being eaten count as orders, not sales,
 * until the counter settles them.
 */
function summarize(orders: ReportOrder[], bills: ReportBill[]) {
  const live = orders.filter((order) => order.status !== "CANCELLED");
  const parcel = live.filter((order) => !order.guestSessionId);
  const parcelSales = parcel.reduce((sum, order) => sum + order.totalAmount, 0);
  const billSales = bills.reduce((sum, bill) => sum + bill.total, 0);
  const sales = billSales + parcelSales;
  const paidCount = bills.length + parcel.length;
  return {
    sales,
    orders: live.length,
    dineIn: live.length - parcel.length,
    parcel: parcel.length,
    cancelled: orders.length - live.length,
    averageBill: paidCount ? Math.round(sales / paidCount) : 0,
    bills: bills.length,
  };
}

function perDay(days: string[], orders: ReportOrder[], bills: ReportBill[]) {
  return days.map((date) => {
    const day = summarize(
      orders.filter((order) => order.businessDate === date),
      bills.filter((bill) => bill.businessDate === date)
    );
    return { date, orders: day.orders, dineIn: day.dineIn, parcel: day.parcel, sales: day.sales, cancelled: day.cancelled };
  });
}

export async function getTodayReport(range: ReportRange): Promise<TodayReportDTO> {
  await connectToDatabase();
  const today = getBusinessDate();
  const { from, to, prevFrom, prevTo } = rangeDates(range, today);
  const lastFrom = shiftDate(today, -6);

  // The period, the one before it and the last 7 days overlap — fetch their union once.
  const spanFrom = [from, prevFrom, lastFrom].sort()[0];
  const [span, categories, menus] = await Promise.all([
    loadPeriod(spanFrom, today),
    Category.find().select({ menuId: 1 }).lean<Pick<CategoryDocument, "_id" | "menuId">[]>(),
    Menu.find().select({ name: 1, nameGu: 1, sortOrder: 1 }).sort({ sortOrder: 1 }).lean<Pick<MenuDocument, "_id" | "name" | "nameGu">[]>(),
  ]);
  const current = slice(span, from, to);
  const previous = slice(span, prevFrom, prevTo);
  const last7 = slice(span, lastFrom, today);

  const now = summarize(current.orders, current.bills);
  const before = summarize(previous.orders, previous.bills);
  const live = current.orders.filter((order) => order.status !== "CANCELLED");

  const byHour = Array.from({ length: 24 }, () => 0);
  for (const order of live) byHour[Number(hourFormat.format(new Date(order.createdAt)))] += 1;

  const menuOfCategory = new Map(categories.map((category) => [String(category._id), String(category.menuId)]));
  const menuById = new Map(menus.map((menu) => [String(menu._id), menu]));
  // "Sales by menu" counts what was paid for (settled bills + parcels), like the Sales card;
  // top dishes count everything served or cooking.
  const paidOrderIds = new Set(current.bills.flatMap((bill) => (bill.orderIds ?? []).map(String)));
  const menuSales = new Map<string, number>();
  const dishes = new Map<string, TodayReportDTO["topDishes"][number]>();
  for (const order of live) {
    const paid = !order.guestSessionId || paidOrderIds.has(String(order._id));
    for (const item of order.items) {
      const menuId = item.categoryId ? menuOfCategory.get(String(item.categoryId)) : undefined;
      const menuKey = menuId && menuById.has(menuId) ? menuId : "other";
      if (paid) menuSales.set(menuKey, (menuSales.get(menuKey) ?? 0) + item.lineTotal);
      const menu = menuId ? menuById.get(menuId) : undefined;
      const key = String(item.menuItemId);
      const dish = dishes.get(key) ?? { name: item.nameSnapshot, nameGu: item.nameGuSnapshot || undefined, menu: menu?.name, menuGu: menu?.nameGu || undefined, quantity: 0, amount: 0 };
      dish.quantity += item.quantity;
      dish.amount += item.lineTotal;
      dishes.set(key, dish);
    }
  }

  // Cash/UPI/Card across settled bills and parcels; v1 parcels never recorded a mode.
  const payment = new Map<PaymentMode, number>();
  const addPayment = (mode: PaymentMode, amount: number) => payment.set(mode, (payment.get(mode) ?? 0) + amount);
  for (const bill of current.bills) addPayment(bill.paymentMode as PaymentMode, bill.total);
  let unrecordedParcels = 0;
  for (const order of live) {
    if (order.guestSessionId) continue;
    if (order.paymentMode) addPayment(order.paymentMode, order.totalAmount);
    else unrecordedParcels += order.totalAmount;
  }
  const byPayment: TodayReportDTO["byPayment"] = [...payment.entries()].map(([mode, amount]) => ({ mode, amount })).sort((a, b) => b.amount - a.amount);
  if (unrecordedParcels > 0) byPayment.push({ mode: "PARCEL", amount: unrecordedParcels });

  return {
    range,
    from,
    to,
    sales: { value: now.sales, previous: before.sales },
    orders: { value: now.orders, previous: before.orders, dineIn: now.dineIn, parcel: now.parcel },
    averageBill: { value: now.averageBill, previous: before.averageBill },
    cancelled: { value: now.cancelled, previous: before.cancelled },
    byHour,
    menuCount: menus.length,
    byMenu: [...menuSales.entries()]
      .map(([key, amount]) => {
        const menu = menuById.get(key);
        return { name: menu?.name ?? "Other", nameGu: menu?.nameGu || undefined, amount };
      })
      .sort((a, b) => b.amount - a.amount),
    byPayment,
    topDishes: [...dishes.values()].sort((a, b) => b.amount - a.amount).slice(0, 5),
    lastDays: perDay(daysBetween(lastFrom, today), last7.orders, last7.bills)
      .reverse()
      .map(({ date, orders, sales, cancelled }) => ({ date, orders, sales, cancelled })),
  };
}

/** One calendar month, day by day (up to today for the current month). */
export async function getMonthReport(month: string): Promise<MonthReportDTO> {
  await connectToDatabase();
  const today = getBusinessDate();
  const from = `${month}-01`;
  const monthEnd = shiftDate(`${shiftDate(from, 32).slice(0, 7)}-01`, -1);
  const to = monthEnd < today ? monthEnd : today;
  if (from > today) return { month, sales: 0, orders: 0, dineIn: 0, parcel: 0, cancelled: 0, bills: 0, days: [] };

  const { orders, bills } = await loadPeriod(from, to);
  const total = summarize(orders, bills);
  return {
    month,
    sales: total.sales,
    orders: total.orders,
    dineIn: total.dineIn,
    parcel: total.parcel,
    cancelled: total.cancelled,
    bills: total.bills,
    days: perDay(daysBetween(from, to), orders, bills).reverse(),
  };
}
