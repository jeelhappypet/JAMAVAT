import { z } from "zod";

const name = z.string().trim().min(1).max(20);
const area = z.string().trim().max(40);

export const tableCreateSchema = z.object({
  name,
  area: area.optional(),
  /** How many QRs (sides) the table gets: A, B, C… */
  seats: z.coerce.number().int().min(1).max(6),
});

export const tableUpdateSchema = z.object({
  name: name.optional(),
  area: area.optional(),
  isActive: z.boolean().optional(),
});

export const seatUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  /** New secret token — the old printed QR stops working. */
  regenerate: z.literal(true).optional(),
});
