import { z } from "zod";

const objectId = z.string().regex(/^[a-f\d]{24}$/i);

export const whatsappSendSchema = z.object({
  conversationId: objectId,
  /** Optional cross-check from the client; must match the conversation's customer. */
  to: z
    .string()
    .trim()
    .regex(/^\+?[\d\s\-()]{8,20}$/)
    .optional(),
  /** WhatsApp text limit is 4096 characters. */
  message: z.string().trim().min(1).max(4096),
});

export const whatsappListSchema = z.object({
  q: z.string().trim().max(60).optional(),
});

export const whatsappMessagesSchema = z.object({
  /** ISO time of the oldest message already shown — loads the page before it. */
  before: z.iso.datetime().optional(),
});
