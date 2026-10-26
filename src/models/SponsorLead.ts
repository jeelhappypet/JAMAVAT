import { Schema, model, models, type InferSchemaType, type Types } from "mongoose";
import { OUTREACH_CHANNELS, SPONSOR_LEAD_STATUSES } from "@/types";

/**
 * A local business HQ wants to sell a guest-screen sponsor slot to
 * (`SALES_SPONSORS.md`). Belongs to HQ, not to a restaurant.
 *
 * The sequence state lives on the row itself — `step` is where the lead is in
 * `lib/outreach/sequence.ts` and `nextActionAt` is the day the bot picks it
 * up. One conditional update per send moves both, so a cron that runs twice
 * (a retry, two regions) cannot mail the same business two mornings' worth.
 */
const sponsorLeadSchema = new Schema(
  {
    business: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    ownerName: { type: String, trim: true },

    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    /** Digits only, `91…` — what WhatsApp's webhook matches an inbound message on. */
    phoneKey: { type: String },
    instagram: { type: String, trim: true },

    /**
     * Guest sessions a month across the live restaurants in this area. It goes
     * verbatim into the pitch, so it is stored rather than guessed at send
     * time: the mail that went out must stay provable.
     */
    sessionsInArea: { type: Number, default: 0 },
    /** The language the mail and the WhatsApp text are written in. */
    lang: { type: String, enum: ["en", "gu"], default: "gu" },

    status: { type: String, enum: SPONSOR_LEAD_STATUSES, default: "TODO" },
    /** Index into `OUTREACH_STEPS`. */
    step: { type: Number, default: 0 },
    /** The day this lead's next step is due. Null parks it out of the bot's way. */
    nextActionAt: { type: Date },
    /**
     * When the current manual step (a WhatsApp tap, a door visit) was first
     * offered in the digest. The bot re-offers it each morning, and after
     * `MANUAL_PATIENCE_DAYS` moves past it — a step nobody did in three days
     * is not going to happen, and a lead must not stall on it forever.
     */
    manualSince: { type: Date },

    /** Every touch, oldest first — the only record of what was actually sent. */
    touches: {
      type: [
        new Schema(
          {
            channel: { type: String, enum: OUTREACH_CHANNELS, required: true },
            step: { type: Number, required: true },
            at: { type: Date, required: true },
            /** The subject for an email, the first line for a WhatsApp. */
            summary: { type: String, trim: true },
            /** The full text as it went out, so HQ's thread shows what was actually said. */
            text: { type: String, trim: true },
            /** The SMTP Message-ID, so a follow-up replies on the first mail's thread. */
            messageId: { type: String, trim: true },
            /** The Meta wamid, which is what a delivery/read webhook arrives keyed on. */
            wamid: { type: String, trim: true },
            /**
             * WhatsApp reports both from the webhook and they are exact. Email
             * reports only `readAt`, from the tracking pixel, and that is a
             * guess — see `lib/outreach/tracking.ts`.
             */
            deliveredAt: { type: Date },
            readAt: { type: Date },
            /** Set when the bot could not send — the reason, for the digest. */
            failure: { type: String, trim: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },

    repliedAt: { type: Date },
    /** Why the sequence stopped: "replied", "said no", "no contact", "ran out". */
    closedReason: { type: String, trim: true },
    notes: { type: String, trim: true },
    maps: { type: String, trim: true },
  },
  { timestamps: true }
);

// "What does the bot send this morning" — the only query that runs on a timer.
sponsorLeadSchema.index({ status: 1, nextActionAt: 1 });
// An inbound WhatsApp arrives with a wa_id and nothing else to match on.
sponsorLeadSchema.index({ phoneKey: 1 });
// A delivery or read webhook arrives with a wamid and nothing else.
sponsorLeadSchema.index({ "touches.wamid": 1 }, { sparse: true });
// HQ's list, newest first, and the duplicate check on import.
sponsorLeadSchema.index({ area: 1, category: 1 });
sponsorLeadSchema.index({ email: 1 }, { sparse: true });

export type SponsorLeadDocument = InferSchemaType<typeof sponsorLeadSchema> & { _id: Types.ObjectId; createdAt: Date };

export const SponsorLead = models.SponsorLead || model("SponsorLead", sponsorLeadSchema);
