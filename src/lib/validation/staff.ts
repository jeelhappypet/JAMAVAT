import { z } from "zod";
import { STAFF_ROLES } from "@/types";
import { PIN_PATTERN } from "@/lib/auth/constants";

const pin = z.string().regex(PIN_PATTERN, "PIN must be exactly 4 digits");
const name = z.string().trim().min(1, "Enter a name").max(40, "Name is too long");

export const loginSchema = z.object({
  staffId: z.string().min(1),
  pin,
});

const restaurantName = z.string().trim().min(1, "Enter the restaurant name").max(60);

export const setupSchema = z.object({
  setupKey: z.string().min(1, "Enter the setup key"),
  restaurantName,
  name,
  pin,
});

const optionalText = (max: number) => z.string().trim().max(max).optional().transform((value) => value || undefined);

export const restaurantSchema = z.object({
  restaurantName,
  address: optionalText(160),
  phone: optionalText(30),
  /** Must be a real web link — it becomes a button in every thank-you email. */
  reviewUrl: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => !value || /^https:\/\/\S+$/.test(value), "Enter a link that starts with https://"),
});

export const changePinSchema = z
  .object({
    currentPin: pin,
    newPin: pin,
  })
  .refine((data) => data.currentPin !== data.newPin, {
    message: "New PIN must be different from the current one",
  });

export const createStaffSchema = z.object({
  name,
  role: z.enum(STAFF_ROLES),
  pin,
});

export const updateStaffSchema = z.object({
  name: name.optional(),
  role: z.enum(STAFF_ROLES).optional(),
  isActive: z.boolean().optional(),
  /** Admin-set PIN reset; also clears a lockout. */
  pin: pin.optional(),
  logoutEverywhere: z.literal(true).optional(),
  /** Kitchen routing — the full list of categories this login should receive. */
  categoryIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(500).optional(),
});
