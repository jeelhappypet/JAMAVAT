import { z } from "zod";

/** Username-or-email + password for the "find my restaurant" login on Jamavat's own site. */
export const ownerLoginSchema = z.object({
  identifier: z.string().trim().min(1).max(120),
  password: z.string().min(1).max(72),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().max(120),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(10).max(200),
  password: z.string().min(6, "Use at least 6 characters").max(72),
});
