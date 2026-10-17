import type { Model } from "mongoose";
import { connectToDatabase } from "@/lib/db/mongodb";
import type { RestaurantRef } from "@/lib/db/tenant";
import { isDuplicateKeyError } from "@/lib/api";
import { Menu, type MenuDocument } from "@/models/Menu";
import { Category, type CategoryDocument } from "@/models/Category";
import { MenuItem, type MenuItemDocument } from "@/models/MenuItem";
import { LEGACY_MENU_CATEGORIES, type MenuDTO, type MenuItemDTO } from "@/types";

const LEGACY_LABELS: Record<string, { name: string; nameGu: string }> = {
  શાક: { name: "Shaak", nameGu: "શાક" },
  રોટલી: { name: "Rotli", nameGu: "રોટલી" },
  મીઠાઈ: { name: "Sweets", nameGu: "મીઠાઈ" },
  અન્ય: { name: "Other", nameGu: "અન્ય" },
};

async function upsertByLegacyKey<T>(model: Model<T>, restaurantId: RestaurantRef, legacyKey: string, insert: Record<string, unknown>) {
  const filter = { restaurantId, legacyKey };
  try {
    return await model
      .findOneAndUpdate(filter, { $setOnInsert: { ...insert, restaurantId } }, { upsert: true, returnDocument: "after" })
      .lean<{ _id: unknown }>();
  } catch (error) {
    // Two first requests raced on the unique legacyKey — the other one won.
    if (isDuplicateKeyError(error)) return model.findOne(filter).lean<{ _id: unknown }>();
    throw error;
  }
}

/** Only the restaurants whose v1 items have already been migrated, so a second call is free. */
const structureReady = new Set<string>();

/**
 * v1 → v2 menu migration. Idempotent and purely additive, so v1 code still
 * reading the same database keeps working until it's replaced:
 * - no menu yet → create a default "Menu";
 * - v1 items (a `category` string, no `categoryId`) → one category per v1
 *   string under the default menu; the old string field is left untouched.
 * Runs once per server instance, a cheap no-op afterwards.
 */
export async function ensureMenuStructure(restaurantId: RestaurantRef) {
  const key = String(restaurantId);
  if (structureReady.has(key)) return;
  await connectToDatabase();

  const hasMenu = await Menu.exists({ restaurantId });
  const legacyKeys = ((await MenuItem.distinct("category", { restaurantId, categoryId: { $exists: false } })) as unknown[])
    .filter((key): key is string => typeof key === "string" && key.length > 0)
    .sort((a, b) => rank(a) - rank(b));

  if (!hasMenu || legacyKeys.length > 0) {
    const menu = await upsertByLegacyKey(Menu, restaurantId, "default", { name: "Menu", nameGu: "મેનુ", sortOrder: 0, isActive: true });
    for (const [index, legacy] of legacyKeys.entries()) {
      const label = LEGACY_LABELS[legacy] ?? { name: legacy, nameGu: legacy };
      const category = await upsertByLegacyKey(Category, restaurantId, legacy, {
        menuId: menu?._id,
        name: label.name,
        nameGu: label.nameGu,
        sortOrder: index,
        isActive: true,
      });
      await MenuItem.updateMany({ restaurantId, category: legacy, categoryId: { $exists: false } }, { $set: { categoryId: category?._id } });
    }
  }

  structureReady.add(key);
}

function rank(key: string): number {
  const index = (LEGACY_MENU_CATEGORIES as readonly string[]).indexOf(key);
  return index === -1 ? LEGACY_MENU_CATEGORIES.length : index;
}

export function toMenuItemDTO(item: MenuItemDocument): MenuItemDTO {
  return {
    id: String(item._id),
    categoryId: String(item.categoryId),
    name: item.name,
    nameGu: item.nameGu || undefined,
    description: item.description || undefined,
    descriptionGu: item.descriptionGu || undefined,
    isBestseller: item.isBestseller === true,
    imageUrl: item.imageUrl || undefined,
    price: item.price,
    isVeg: item.isVeg !== false,
    isActive: item.isActive !== false,
    isAvailable: item.isAvailable !== false,
  };
}

/** Menus → categories → items, in display order. `activeOnly` hides anything the admin switched off. */
export async function loadMenuTree(restaurantId: RestaurantRef, { activeOnly = false } = {}): Promise<MenuDTO[]> {
  await ensureMenuStructure(restaurantId);
  const active = activeOnly ? { restaurantId, isActive: true } : { restaurantId };

  const [menus, categories, items] = await Promise.all([
    Menu.find(active).sort({ sortOrder: 1, createdAt: 1 }).lean<MenuDocument[]>(),
    Category.find(active).sort({ sortOrder: 1, createdAt: 1 }).lean<CategoryDocument[]>(),
    MenuItem.find({ ...active, categoryId: { $exists: true } })
      .sort({ name: 1 })
      .lean<MenuItemDocument[]>(),
  ]);

  return menus.map((menu) => ({
    id: String(menu._id),
    name: menu.name,
    nameGu: menu.nameGu || undefined,
    isActive: menu.isActive !== false,
    categories: categories
      .filter((category) => String(category.menuId) === String(menu._id))
      .map((category) => ({
        id: String(category._id),
        menuId: String(menu._id),
        name: category.name,
        nameGu: category.nameGu || undefined,
        isActive: category.isActive !== false,
        items: items.filter((item) => String(item.categoryId) === String(category._id)).map(toMenuItemDTO),
      })),
  }));
}
