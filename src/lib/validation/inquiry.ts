import { z } from "zod";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

/** Indian mobile numbers, with or without +91, spaces or dashes. */
const phone = z
  .string()
  .trim()
  .min(8, "Enter your phone number")
  .max(20)
  .refine((value) => /^[6-9]\d{9}$/.test(digitsOf(value)), "Enter a 10-digit mobile number");

/** Last 10 digits — what we store, de-dupe and search on. */
export function digitsOf(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

/**
 * The website's "Book a free demo" form. `website` is a honeypot: a real
 * person never sees the field, so anything in it is a bot and the request is
 * answered as if it worked.
 */
export const inquirySchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(60),
  phone,
  restaurantName: text(80),
  city: text(60),
  email: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value), "Enter a valid email"),
  tables: text(30),
  kitchens: text(30),
  message: text(1000),
  source: text(120),
  utm: z.record(z.string().max(40), z.string().max(200)).optional(),
  lang: z.enum(["en", "gu"]).default("en"),
  website: z.string().max(200).optional(),
});

export type InquiryInput = z.infer<typeof inquirySchema>;

/**
 * A lead HQ adds itself — a restaurant someone walked into or found on the
 * map. The *restaurant's* name is the required one here, not a person's: on
 * the road you have the board over the door long before you have the owner's
 * name, and refusing to save that would just mean it gets written on paper.
 */
export const leadSchema = z.object({
  restaurantName: z.string().trim().min(1, "Enter the restaurant's name").max(80),
  phone,
  name: text(60),
  city: text(60),
  email: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value), "Enter a valid email"),
  tables: text(30),
  notes: text(1000),
  /** YYYY-MM-DD, the day to come back to them. */
  followUpAt: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), "Pick a date"),
  lang: z.enum(["en", "gu"]).default("gu"),
});

export type LeadInput = z.infer<typeof leadSchema>;
