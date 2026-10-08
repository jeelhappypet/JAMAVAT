import { isValidObjectId } from "mongoose";
import { MenuItem, type MenuItemDocument } from "@/models/MenuItem";
import { Category, type CategoryDocument } from "@/models/Category";
import { Counter } from "@/models/Counter";
import { ensureMenuStructure } from "@/lib/menu/structure";
import type { Translate } from "@/lib/i18n/messages";

export interface RequestedItem {
  menuItemId: string;
  quantity: number;
}

export type BuiltItems =
  | { ok: true; items: Record<string, unknown>[]; totalAmount: number }
  | { ok: false; status: number; error: string };

/**
 * Turns requested dishes into order lines with name/price/category
 * snapshots. Shared by counter and QR orders so both refuse hidden or
 * sold-out dishes the same way.
 */
export async function buildOrderItems(requested: RequestedItem[], t: Translate): Promise<BuiltItems> {
  // v1 items get their categoryId here on first use, so routing works for them too.
  await ensureMenuStructure();
  const ids = requested.map((item) => item.menuItemId);
  if (!ids.every(isValidObjectId)) return { ok: false, status: 400, error: t("err.itemMissing") };

  const menuItems = await MenuItem.find({ _id: { $in: ids } }).lean<MenuItemDocument[]>();
  const menuItemById = new Map(menuItems.map((item) => [String(item._id), item]));
  const categories = await Category.find({ _id: { $in: menuItems.map((item) => item.categoryId) } }).lean<CategoryDocument[]>();
  const categoryById = new Map(categories.map((category) => [String(category._id), category]));

  const items: Record<string, unknown>[] = [];
  let totalAmount = 0;
  for (const requestedItem of requested) {
    const menuItem = menuItemById.get(requestedItem.menuItemId);
    const category = menuItem ? categoryById.get(String(menuItem.categoryId)) : undefined;
    if (!menuItem || menuItem.isActive === false || category?.isActive === false) {
      return { ok: false, status: 400, error: t("err.itemMissing") };
    }
    if (menuItem.isAvailable === false) return { ok: false, status: 409, error: t("err.itemSoldOut", { name: menuItem.name }) };
    const lineTotal = menuItem.price * requestedItem.quantity;
    totalAmount += lineTotal;
    items.push({
      menuItemId: menuItem._id,
      nameSnapshot: menuItem.name,
      nameGuSnapshot: menuItem.nameGu || undefined,
      categoryId: menuItem.categoryId,
      categorySnapshot: category?.name ?? menuItem.category ?? "",
      quantity: requestedItem.quantity,
      unitPrice: menuItem.price,
      lineTotal,
      status: "PENDING",
    });
  }
  return { ok: true, items, totalAmount };
}

/** Next token for the business day — one shared sequence for parcel and QR orders. */
export async function nextTokenNumber(businessDate: string): Promise<number> {
  const counter = await Counter.findOneAndUpdate({ _id: businessDate }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return counter.seq;
}
