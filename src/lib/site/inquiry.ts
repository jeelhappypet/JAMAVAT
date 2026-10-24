import { connectToDatabase } from "@/lib/db/mongodb";
import { Inquiry, type InquiryDocument } from "@/models/Inquiry";
import { escapeHtml, isMailConfigured, sendMail } from "@/lib/mail";
import { digitsOf, type InquiryInput, type LeadInput } from "@/lib/validation/inquiry";
import type { InquiryDTO, InquiryStatus } from "@/types";

/** One phone number may send this many inquiries before HQ has looked at the first. */
const SAME_PHONE_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Simple per-instance throttle: a flood from one address is dropped before it reaches Mongo. */
const RATE_LIMIT = { max: 5, windowMs: 60 * 60 * 1000 };
const seen = new Map<string, number[]>();

export function tooManyFrom(ip: string, now = Date.now()): boolean {
  const recent = (seen.get(ip) ?? []).filter((at) => now - at < RATE_LIMIT.windowMs);
  recent.push(now);
  seen.set(ip, recent);
  if (seen.size > 5000) seen.clear();
  return recent.length > RATE_LIMIT.max;
}

export function toInquiryDTO(doc: InquiryDocument): InquiryDTO {
  return {
    id: String(doc._id),
    name: doc.name,
    phone: doc.phone,
    restaurantName: doc.restaurantName || undefined,
    city: doc.city || undefined,
    email: doc.email || undefined,
    tables: doc.tables || undefined,
    kitchens: doc.kitchens || undefined,
    message: doc.message || undefined,
    status: (doc.status ?? "NEW") as InquiryStatus,
    notes: doc.notes || undefined,
    restaurantId: doc.restaurantId ? String(doc.restaurantId) : undefined,
    source: doc.source || undefined,
    lang: (doc.lang === "gu" ? "gu" : "en") as "en" | "gu",
    createdAt: doc.createdAt.toISOString(),
    contactedAt: doc.contactedAt?.toISOString(),
    followUpAt: doc.followUpAt?.toISOString(),
  };
}

/**
 * Saves a demo request. The same phone number inside a day updates the one
 * inquiry HQ is already looking at, instead of filling the list with
 * duplicates from someone who submitted the form twice.
 */
export async function saveInquiry(input: InquiryInput): Promise<InquiryDocument> {
  await connectToDatabase();
  const phoneKey = digitsOf(input.phone);
  const fields = {
    name: input.name,
    phone: input.phone,
    phoneKey,
    restaurantName: input.restaurantName,
    city: input.city,
    email: input.email,
    tables: input.tables,
    kitchens: input.kitchens,
    message: input.message,
    source: input.source,
    utm: input.utm,
    lang: input.lang,
  };

  const recent = await Inquiry.findOne({
    phoneKey,
    status: { $in: ["NEW", "CONTACTED"] },
    createdAt: { $gt: new Date(Date.now() - SAME_PHONE_WINDOW_MS) },
  })
    .sort({ createdAt: -1 })
    .lean<InquiryDocument>();

  if (recent) {
    return (await Inquiry.findOneAndUpdate({ _id: recent._id }, { $set: fields }, { returnDocument: "after" }).lean<InquiryDocument>())!;
  }
  return (await Inquiry.create(fields)).toObject() as InquiryDocument;
}

/** Tells the owner a lead came in. Never fails the request — the inquiry is already saved. */
export async function notifyHq(inquiry: InquiryDocument): Promise<void> {
  const to = process.env.HQ_EMAIL?.trim() || process.env.SMTP_USER?.trim();
  if (!to || !isMailConfigured()) return;

  const rows: [string, string | undefined][] = (
    [
      ["Phone", inquiry.phone],
      ["Restaurant", inquiry.restaurantName],
      ["City", inquiry.city],
      ["Email", inquiry.email],
      ["Tables", inquiry.tables],
      ["Kitchens", inquiry.kitchens],
      ["Message", inquiry.message],
      ["Page", inquiry.source],
    ] as [string, string | null | undefined][]
  ).map(([label, value]) => [label, value || undefined]);
  const lines = rows.filter(([, value]) => value).map(([label, value]) => `${label}: ${value}`);

  try {
    await sendMail({
      to,
      fromName: "Jamavat",
      subject: `New Jamavat inquiry — ${inquiry.name}${inquiry.city ? `, ${inquiry.city}` : ""}`,
      text: [`${inquiry.name} asked for a demo.`, "", ...lines].join("\n"),
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;color:#1c1917">
  <p style="font-size:16px;font-weight:bold;margin:0 0 12px">${escapeHtml(inquiry.name)} asked for a demo</p>
  <table style="font-size:14px;border-collapse:collapse">${rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#57534e">${label}</td><td style="padding:4px 0"><strong>${escapeHtml(String(value))}</strong></td></tr>`
    )
    .join("")}</table>
</div>`,
    });
  } catch (error) {
    console.error("[inquiry] HQ email failed", error);
  }
}

/**
 * A lead HQ added itself (a restaurant visited or found on the map). Same
 * row as a website inquiry — one pipeline, not two — and the same phone rule:
 * walking into a place that already asked for a demo updates that row rather
 * than starting a second one, so nobody gets called twice by mistake.
 */
export async function saveLead(input: LeadInput): Promise<InquiryDocument> {
  await connectToDatabase();
  const phoneKey = digitsOf(input.phone);
  const existing = await Inquiry.findOne({ phoneKey, status: { $in: ["NEW", "CONTACTED"] } }).sort({ createdAt: -1 });
  const fields = {
    // The board over the door is what we have; the owner's name comes later.
    name: input.name || input.restaurantName,
    phone: input.phone,
    phoneKey,
    restaurantName: input.restaurantName,
    city: input.city,
    email: input.email,
    tables: input.tables,
    notes: input.notes,
    followUpAt: input.followUpAt ? new Date(`${input.followUpAt}T00:00:00+05:30`) : undefined,
    source: "hq:added",
    lang: input.lang,
  };
  if (existing) {
    // Keep whatever HQ already wrote; fill in only what the new visit adds.
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== "") existing.set(key, value);
    }
    await existing.save();
    return existing.toObject() as InquiryDocument;
  }
  return (await Inquiry.create({ ...fields, status: "NEW" })).toObject() as InquiryDocument;
}
