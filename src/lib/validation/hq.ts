import { z } from "zod";
import { BILLING_CYCLES, RESTAURANT_STATUSES, INQUIRY_STATUSES, SUBSCRIPTION_PAYMENT_METHODS } from "@/types";
import { SLUG_MAX, isValidSlug } from "@/lib/utils/slug";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

const localized = z.object({ en: z.string().trim().max(400).default(""), gu: z.string().trim().max(400).default("") });

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .max(SLUG_MAX)
  .refine(isValidSlug, "Use 3–40 lower-case letters, numbers and dashes — and not a word Jamavat uses itself");

export const createRestaurantSchema = z.object({
  name: z.string().trim().min(1, "Enter the restaurant's name").max(60),
  /** Left out: made from the name, with a number added if it's taken. */
  slug: slug.optional(),
  ownerName: optional(60),
  ownerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(120)
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(value), "Enter a valid email"),
  ownerPhone: optional(20),
  city: optional(60),
  planId: optional(24),
  billingCycle: z.enum(BILLING_CYCLES).optional(),
  /** Free days before the first payment is due. */
  trialDays: z.number().int().min(0).max(180).optional(),
  inquiryId: optional(24),
  /** Email the invite link to the owner as well as showing it in HQ. */
  sendInvite: z.boolean().optional(),
  /** The "find my restaurant" login on Jamavat's own site — both optional, set up now or later. */
  ownerUsername: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9._-]+$/, "Letters, numbers, dots, dashes and underscores only")
    .optional()
    .transform((value) => value || undefined),
  ownerPassword: z
    .string()
    .min(6, "Use at least 6 characters")
    .max(72)
    .optional()
    .transform((value) => value || undefined),
});

export const updateRestaurantSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  slug: slug.optional(),
  status: z.enum(RESTAURANT_STATUSES).optional(),
  planId: z
    .string()
    .trim()
    .max(24)
    .nullable()
    .optional()
    .transform((value) => (value === "" ? null : value)),
  billingCycle: z.enum(BILLING_CYCLES).optional(),
  /** YYYY-MM-DD, or null to take the end date off entirely. */
  paidUntil: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  graceDays: z.number().int().min(0).max(60).optional(),
  ownerName: optional(60),
  ownerEmail: optional(120),
  ownerPhone: optional(20),
  city: optional(60),
  notes: optional(1000),
  whatsappPhoneNumberId: optional(40),
  /** Issue a fresh invite link (the old one stops working). */
  reinvite: z.literal(true).optional(),
  ownerUsername: z
    .string()
    .trim()
    .toLowerCase()
    .max(40)
    .nullable()
    .optional()
    .transform((value) => (value === "" ? null : value))
    .refine((value) => !value || /^[a-z0-9._-]{3,40}$/.test(value), "Letters, numbers, dots, dashes and underscores only, 3+ characters"),
  /** Set/replace the owner-login password directly — never returned, hashed on save. Not trimmed: a password's whitespace is significant. */
  newOwnerPassword: z
    .string()
    .max(72)
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || value.length >= 6, "Use at least 6 characters"),
});

export const recordPaymentSchema = z.object({
  amount: z.number().min(0).max(10_000_000),
  method: z.enum(SUBSCRIPTION_PAYMENT_METHODS),
  months: z.number().int().min(1).max(36),
  cycle: z.enum(BILLING_CYCLES).optional(),
  paidAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  note: optional(300),
});

/** Editing an existing payment — every field optional (PATCH), re-validated the same way. */
export const updatePaymentSchema = z.object({
  amount: z.number().min(0).max(10_000_000).optional(),
  method: z.enum(SUBSCRIPTION_PAYMENT_METHODS).optional(),
  months: z.number().int().min(1).max(36).optional(),
  cycle: z.enum(BILLING_CYCLES).optional(),
  paidAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  note: optional(300),
});

export const planSchema = z.object({
  name: localized,
  description: localized.optional(),
  priceMonthly: z.number().min(0).max(10_000_000).default(0),
  priceYearly: z.number().min(0).max(100_000_000).default(0),
  maxSeats: z.number().int().min(0).max(10_000).nullable().optional(),
  maxStaff: z.number().int().min(0).max(1000).nullable().optional(),
  whatsapp: z.boolean().optional(),
  highlights: z.array(localized).max(10).optional(),
  isPublic: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(100).optional(),
});

export const updateInquirySchema = z.object({
  status: z.enum(INQUIRY_STATUSES).optional(),
  notes: optional(1000),
});
