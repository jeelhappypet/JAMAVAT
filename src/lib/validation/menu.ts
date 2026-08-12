import { z } from "zod";
import { MENU_CATEGORIES } from "@/types";

export const menuItemInputSchema = z.object({
  name: z.string().trim().min(1, "આઇટમનું નામ જરૂરી છે"),
  category: z.enum(MENU_CATEGORIES, { message: "માન્ય કેટેગોરી પસંદ કરો" }),
  price: z.coerce.number().positive("ભાવ 0 થી વધુ હોવો જોઈએ"),
  isActive: z.boolean().optional(),
});

export const menuSaveSchema = z.object({
  items: z.array(menuItemInputSchema).min(1, "ઓછામાં ઓછી એક આઇટમ ઉમેરો"),
});

export const menuUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).optional(),
  category: z.enum(MENU_CATEGORIES).optional(),
  price: z.coerce.number().positive().optional(),
  isActive: z.boolean().optional(),
});
