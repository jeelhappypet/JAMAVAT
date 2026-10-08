/**
 * WhatsApp ids (wa_id) are the international number in digits only, e.g.
 * "919876543210". Returns that form, or null when it can't be a phone number
 * (E.164 allows 8–15 digits including the country code).
 */
export function normalizeWaNumber(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const digits = String(value).replace(/[\s\-().+]/g, "");
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

/** "+91 98765 43210" for Indian numbers, "+<digits>" for the rest. Display only. */
export function formatWaNumber(waId: string): string {
  if (/^91\d{10}$/.test(waId)) return `+91 ${waId.slice(2, 7)} ${waId.slice(7)}`;
  return `+${waId}`;
}
