import { z } from "zod";

// Field names double as i18n lookups in lib/i18n/zod.ts — keep them stable.
const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const name = z.string().trim().min(1).max(60);
/** Optional Gujarati name; "" clears it. */
const nameGu = z.string().trim().max(60);
const price = z.coerce.number().min(0).max(100000);

export const menuCreateSchema = z.object({ name, nameGu: nameGu.optional() });

export const menuUpdateSchema = z.object({
  name: name.optional(),
  nameGu: nameGu.optional(),
  isActive: z.boolean().optional(),
});

export const categoryCreateSchema = z.object({ menuId: objectId, name, nameGu: nameGu.optional() });

export const categoryUpdateSchema = z.object({
  menuId: objectId.optional(),
  name: name.optional(),
  nameGu: nameGu.optional(),
  isActive: z.boolean().optional(),
});

export const itemCreateSchema = z.object({
  categoryId: objectId,
  name,
  nameGu: nameGu.optional(),
  price,
  isVeg: z.boolean().optional(),
});

export const itemUpdateSchema = z.object({
  categoryId: objectId.optional(),
  name: name.optional(),
  nameGu: nameGu.optional(),
  price: price.optional(),
  isVeg: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
});

export const reorderSchema = z.object({
  kind: z.enum(["menu", "category"]),
  ids: z.array(objectId).min(1).max(500),
});

/** Splits a validated patch into $set and $unset, so an empty Gujarati name removes the field. */
export function toMongoUpdate(patch: Record<string, unknown>) {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (key === "nameGu" && value === "") $unset[key] = 1;
    else $set[key] = value;
  }
  return {
    ...(Object.keys($set).length ? { $set } : {}),
    ...(Object.keys($unset).length ? { $unset } : {}),
  };
}
