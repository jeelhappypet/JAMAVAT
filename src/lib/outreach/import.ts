import { SponsorLead, type SponsorLeadDocument } from "@/models/SponsorLead";

/**
 * Taking leads in from a pasted sheet. HQ's screen is the only way in — the
 * list is built in Google Maps and pasted here, and nobody should need a
 * terminal or a checkout to add a sponsor.
 *
 * Re-pasting the same rows is safe and expected: a row already in the
 * sequence keeps its step, its status and its history, and only has blanks
 * filled in. Re-importing must never mail the same business twice.
 */

/**
 * The sheet's columns, defined once. The blank template HQ hands out, the
 * export, the parser and the help text in the dialog all read this list, so
 * a column can never exist in the template and be ignored on the way back in.
 */
export const LEAD_COLUMNS = [
  { name: "business", hint: "Required. The shop's name.", example: "Iron Fitness" },
  { name: "category", hint: "Gym, Dental clinic, Salon…  One per area gets exclusivity.", example: "Gym" },
  { name: "area", hint: "Adajan, Vesu, Piplod…", example: "Adajan" },
  { name: "owner_name", hint: "Who the pitch greets. Falls back to the business name.", example: "Rajesh bhai" },
  { name: "email", hint: "Their own published address. Leave blank if there isn't one.", example: "owner@ironfitness.in" },
  { name: "phone", hint: "Any format; 10 digits is enough.", example: "9876543210" },
  { name: "instagram", hint: "Handle. A shop that posts weekly already buys advertising.", example: "@ironfitness.surat" },
  { name: "sessions_in_area", hint: "Live restaurants in that area x 1800. Goes into the pitch, so it must be true.", example: "9000" },
  { name: "lang", hint: "gu or en. Blank means ગુજરાતી.", example: "gu" },
  { name: "notes", hint: "Anything for you. Never sent.", example: "Big board outside, spends on hoardings" },
  { name: "maps_search", hint: "The Maps query the row came from.", example: "gym in Adajan Surat" },
] as const;

/** One CSV field, quoted only when it has to be. */
function cell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function toCsv(rows: Record<string, string>[]): string {
  const header = LEAD_COLUMNS.map((c) => c.name);
  return [header.join(","), ...rows.map((row) => header.map((name) => cell(row[name] ?? "")).join(","))].join("\n") + "\n";
}

/**
 * The blank sheet. Two example rows rather than none: the shape of
 * `sessions_in_area` and an empty `email` are both easier to copy than to
 * describe, and they are obviously placeholders to delete.
 */
export function templateCsv(): string {
  return toCsv([
    Object.fromEntries(LEAD_COLUMNS.map((c) => [c.name, c.example])),
    { business: "Smile Dental", category: "Dental clinic", area: "Vesu", email: "", phone: "9876500000", sessions_in_area: "5400", notes: "No website — WhatsApp only" },
  ]);
}

export interface LeadRow {
  business: string;
  category?: string;
  area?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  instagram?: string;
  sessionsInArea?: number;
  lang?: "en" | "gu";
  notes?: string;
  maps?: string;
}

/** Minimal RFC-4180: quoted fields, doubled quotes, commas and newlines inside them. */
export function parseCsv(input: string): Record<string, string>[] {
  // A sheet downloaded from here carries a BOM so Excel reads it as UTF-8;
  // pasted back, that byte would make the first heading "\uFEFFbusiness" and
  // every row would look like it had no business name.
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const filled = rows.filter((cells) => cells.some((cell) => cell.trim()));
  const [header, ...body] = filled;
  if (!header) return [];
  const names = header.map((name) => name.trim().toLowerCase());
  return body.map((cells) => Object.fromEntries(names.map((name, index) => [name, (cells[index] || "").trim()])));
}

/** The sheet's column names, in the spelling `sponsor-outreach.csv` uses. */
export function toRow(record: Record<string, string>): LeadRow | null {
  const business = record.business?.trim();
  if (!business) return null;
  return {
    business,
    category: record.category || undefined,
    area: record.area || undefined,
    ownerName: record.owner_name || record.ownername || undefined,
    email: record.email || undefined,
    phone: record.phone || undefined,
    instagram: record.instagram || undefined,
    sessionsInArea: Number(record.sessions_in_area || record.sessions || 0) || 0,
    lang: record.lang === "en" ? "en" : "gu",
    notes: record.notes || undefined,
    maps: record.maps_search || record.maps || undefined,
  };
}

/** Last 10 digits prefixed with 91 — the shape an inbound WhatsApp wa_id arrives in. */
export function phoneKeyOf(phone: string | undefined): string | undefined {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length >= 10 ? `91${digits.slice(-10)}` : undefined;
}

export interface ImportResult {
  created: number;
  updated: number;
  unchanged: number;
  /** Rows with no business name — nothing to file them under. */
  blank: number;
}

export async function importLeads(rows: LeadRow[], now: Date = new Date()): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, unchanged: 0, blank: 0 };

  for (const row of rows) {
    if (!row.business) {
      result.blank += 1;
      continue;
    }
    const email = row.email?.trim().toLowerCase() || undefined;
    const phoneKey = phoneKeyOf(row.phone);
    const contactable = Boolean(email || phoneKey);

    // Matched on whatever identifies the business best, so the same shop
    // pasted twice under a slightly different name is still one lead.
    const where = email ? { email } : phoneKey ? { phoneKey } : { business: row.business, area: row.area };
    const existing = (await SponsorLead.findOne(where).lean()) as unknown as SponsorLeadDocument | null;

    const fields: Record<string, unknown> = {
      business: row.business,
      category: row.category,
      area: row.area,
      ownerName: row.ownerName,
      email,
      phone: row.phone,
      phoneKey,
      instagram: row.instagram,
      maps: row.maps,
      notes: row.notes,
    };

    if (!existing) {
      await SponsorLead.create({
        ...fields,
        sessionsInArea: row.sessionsInArea ?? 0,
        lang: row.lang ?? "gu",
        status: contactable ? "ACTIVE" : "TODO",
        step: 0,
        nextActionAt: contactable ? now : null,
        touches: [],
      });
      result.created += 1;
      continue;
    }

    // Only fill blanks: the sheet is not the source of truth for anything the
    // bot has already done.
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== "" && !(existing as unknown as Record<string, unknown>)[key]) patch[key] = value;
    }
    // The audience number is the one thing a re-paste is allowed to correct,
    // because it goes verbatim into the pitch and it changes as restaurants
    // go live.
    if (row.sessionsInArea && row.sessionsInArea !== existing.sessionsInArea) patch.sessionsInArea = row.sessionsInArea;
    // A row that finally has contact details joins the queue.
    if (existing.status === "TODO" && contactable) {
      patch.status = "ACTIVE";
      patch.nextActionAt = now;
    }

    if (Object.keys(patch).length === 0) {
      result.unchanged += 1;
      continue;
    }
    await SponsorLead.updateOne({ _id: existing._id }, { $set: patch });
    result.updated += 1;
  }

  return result;
}
