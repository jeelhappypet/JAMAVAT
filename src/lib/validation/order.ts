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
    .min(1),
  clientRequestId: z.string().min(1),
  /** "Add item" on a seat's page: the order joins that guest's bill instead of being a parcel. */
  seatId: z.string().min(1).optional(),
});
