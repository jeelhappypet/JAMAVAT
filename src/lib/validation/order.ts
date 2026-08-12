import { z } from "zod";

export const createOrderSchema = z.object({
  customerName: z.string().trim().max(80).optional(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1),
        quantity: z.coerce.number().int().min(1).max(99),
      })
    )
    .min(1, "ઓછામાં ઓછી એક આઇટમ પસંદ કરો"),
  clientRequestId: z.string().min(1, "clientRequestId જરૂરી છે"),
});
