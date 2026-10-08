import { z } from "zod";
import { PAYMENT_MODES } from "@/types";

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

export const settleSchema = z.object({
  /** The sitting the counter is looking at — a stale page can't settle the next guest. */
  sessionId: z.string().min(1),
  discount: z.coerce.number().int().min(0).max(1_000_000).default(0),
  paymentMode: z.enum(PAYMENT_MODES),
  sendEmail: z.boolean().default(true),
});
