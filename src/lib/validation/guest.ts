import { z } from "zod";

// Field names double as i18n lookups in lib/i18n/zod.ts — keep them stable.
const token = z.string().regex(/^[\w-]{8,64}$/);
const email = z.email().trim().toLowerCase().max(120);

export const otpSendSchema = z.object({ token, email });

export const otpVerifySchema = z.object({
  token,
  email,
  code: z.string().regex(/^\d{6}$/),
  remember: z.boolean().optional(),
});

export const guestOrderSchema = z.object({
  token,
  items: z
    .array(z.object({ menuItemId: z.string().min(1), quantity: z.coerce.number().int().min(1).max(20) }))
    .min(1)
    .max(50),
  note: z.string().trim().max(200).optional(),
  clientRequestId: z.string().min(8).max(100),
});
