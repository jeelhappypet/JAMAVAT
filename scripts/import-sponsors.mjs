/**
 * Loads `sponsor-outreach.csv` into the SponsorLead collection, so the
 * outreach bot (`src/lib/outreach/run.ts`) has something to work from.
 *
 *   node scripts/import-sponsors.mjs                      # dry run, prints what it would do
 *   node scripts/import-sponsors.mjs --write
 *   MONGODB_URI="…/jamavat_dev" node scripts/import-sponsors.mjs --write
 *
 * Re-runnable: a row is matched on email, else on phone, else on
 * business+area, and an existing lead is only topped up with contact details
 * it was missing. It never resets a lead's step or re-opens one that replied
 * or died — re-importing the sheet must not mail someone a second time.
 *
 * A row with no email and no phone is imported as TODO: it is on the list to
 * research, and the bot leaves it alone until it has an address to use.
 */
import { readFileSync } from "node:fs";
import mongoose from "mongoose";

const WRITE = process.argv.includes("--write");
const FILE = process.argv.find((arg) => arg.endsWith(".csv")) || "sponsor-outreach.csv";

function env() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
    }
  } catch {
    /* no .env.local — MONGODB_URI must already be in the environment */
  }
}

/** Minimal RFC-4180 parse: quoted fields, doubled quotes, commas inside them. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (char !== "\r") field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter((cells) => cells.some((cell) => cell.trim()));
  return body.map((cells) => Object.fromEntries(header.map((name, index) => [name.trim(), (cells[index] || "").trim()])));
}

/** Last 10 digits, prefixed 91 — the form an inbound WhatsApp wa_id arrives in. */
function phoneKeyOf(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  return digits.length >= 10 ? `91${digits.slice(-10)}` : null;
}

const schema = new mongoose.Schema({}, { strict: false, collection: "sponsorleads", timestamps: true });
const SponsorLead = mongoose.models.SponsorLead || mongoose.model("SponsorLead", schema);

async function main() {
  env();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (/JAMAVATDATA/i.test(uri) && !process.argv.includes("--live")) {
    throw new Error("That is the live database. Pass --live if you really mean it.");
  }

  const rows = parseCsv(readFileSync(FILE, "utf8"));
  await mongoose.connect(uri);

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  /** Rows still waiting to be researched — no business name filled in yet. */
  let blank = 0;

  for (const row of rows) {
    if (!row.business?.trim()) { blank += 1; continue; }

    const phoneKey = phoneKeyOf(row.phone);
    const email = row.email?.trim().toLowerCase() || null;
    const where = email ? { email } : phoneKey ? { phoneKey } : { business: row.business, area: row.area };
    const existing = await SponsorLead.findOne(where).lean();

    const contactable = Boolean(email || phoneKey);
    const fields = {
      business: row.business,
      category: row.category,
      area: row.area,
      ownerName: row.owner_name || undefined,
      email: email || undefined,
      phone: row.phone || undefined,
      phoneKey: phoneKey || undefined,
      instagram: row.instagram || undefined,
      sessionsInArea: Number(row.sessions_in_area || 0) || 0,
      maps: row.maps_search || undefined,
      notes: row.notes || undefined,
    };

    if (existing) {
      // Only fill blanks. A lead already in the sequence keeps its step,
      // its status and its touches — the sheet is not the source of truth
      // for anything the bot has already done.
      const patch = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined && value !== "" && !existing[key]) patch[key] = value;
      }
      if (fields.sessionsInArea && fields.sessionsInArea !== existing.sessionsInArea) {
        patch.sessionsInArea = fields.sessionsInArea;
      }
      // A TODO row that finally has contact details joins the queue.
      if (existing.status === "TODO" && contactable) {
        patch.status = "ACTIVE";
        patch.nextActionAt = new Date();
      }
      if (Object.keys(patch).length === 0) { unchanged += 1; continue; }
      if (WRITE) await SponsorLead.updateOne({ _id: existing._id }, { $set: patch });
      updated += 1;
      continue;
    }

    if (WRITE) {
      await SponsorLead.create({
        ...fields,
        lang: row.lang === "en" ? "en" : "gu",
        status: contactable ? "ACTIVE" : "TODO",
        step: 0,
        nextActionAt: contactable ? new Date() : null,
        touches: [],
      });
    }
    created += 1;
  }

  const queued = await SponsorLead.countDocuments({ status: "ACTIVE" });
  const todo = await SponsorLead.countDocuments({ status: "TODO" });
  console.log(`${WRITE ? "Imported" : "Would import"}: ${created} new, ${updated} updated, ${unchanged} unchanged.`);
  if (blank) console.log(`${blank} rows have no business name yet — fill those in from Google Maps (SPONSOR_EMAIL_OUTREACH.md §2).`);
  if (WRITE) console.log(`Queue now: ${queued} active, ${todo} waiting for contact details.`);
  else console.log("Dry run — pass --write to save.");

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
