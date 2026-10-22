import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";
import { SITE_STAT_KINDS } from "@/types";

/**
 * How Jamavat's own website is doing: one counter per day, page, language,
 * kind and label. Belongs to HQ, not to any restaurant.
 *
 * Counters, not events. A row per visit would grow without limit and would
 * have to be aggregated on every read; this way a busy day is still a few
 * dozen documents (≈10 pages × 2 languages × a handful of labels) and HQ's
 * screen is one indexed range query.
 *
 * Nothing here identifies a person: no address, no cookie, no visitor id.
 * It answers "how many" and never "who", which is also why the website needs
 * no consent banner for it.
 */
const siteStatSchema = new Schema(
  {
    /** Calendar day in IST (YYYY-MM-DD) — the business's own day, not UTC's. */
    day: { type: String, required: true },
    /** Language-stripped page path: "/", "/pricing", "/qr-code-ordering-system". */
    path: { type: String, required: true },
    lang: { type: String, enum: ["en", "gu"], required: true },
    kind: { type: String, enum: SITE_STAT_KINDS, required: true },
    /** "page" for a view; for a click, which button (see TRACKED_LABELS). */
    label: { type: String, required: true },
    count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// The upsert key: one row per bucket, incremented.
siteStatSchema.index({ day: 1, path: 1, lang: 1, kind: 1, label: 1 }, { unique: true });
// HQ reads "the last N days", newest first.
siteStatSchema.index({ day: -1 });

export type SiteStatDocument = InferSchemaType<typeof siteStatSchema> & { _id: Types.ObjectId };

export const SiteStat = models.SiteStat || model("SiteStat", siteStatSchema);
