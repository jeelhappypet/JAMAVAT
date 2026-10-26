import { afterEach, describe, expect, it } from "vitest";
import { OUTREACH_STEPS, canRun, dueAt, isAutomatic, nextRunnable } from "@/lib/outreach/sequence";
import * as pitch from "@/lib/outreach/compose";
import { dailyCap, mailerProblem, resetOutreachMailer } from "@/lib/outreach/mailer";
import { digestHtml, digestText } from "@/lib/outreach/digest";
import { TEMPLATE_BODY, renderTemplate, templateParams, whatsappProblem } from "@/lib/outreach/whatsapp";
import { isValidOpen, openPixelUrl, signOpen } from "@/lib/outreach/tracking";
import { LEAD_COLUMNS, parseCsv, phoneKeyOf, templateCsv, toCsv, toRow } from "@/lib/outreach/import";
import type { OutreachRunSummary } from "@/types";

const DAY = 24 * 60 * 60 * 1000;

const lead: pitch.Pitchable & { email?: string | null; phoneKey?: string | null } = {
  business: "Iron Fitness",
  category: "Gym",
  area: "Adajan",
  ownerName: "Rajesh bhai",
  sessionsInArea: 9000,
  lang: "gu",
  email: "owner@ironfitness.in",
  phoneKey: "919876543210",
};

const from = { name: "Jeel", phone: "+91 98765 00000" };

describe("the sequence", () => {
  it("is two emails and no more", () => {
    expect(OUTREACH_STEPS.filter((step) => step.channel === "email")).toHaveLength(2);
  });

  it("never walks into a shop by itself", () => {
    for (const step of OUTREACH_STEPS) {
      expect(isAutomatic(step)).toBe(step.channel !== "visit");
    }
  });

  it("counts every step from the first touch, not the one before it", () => {
    const start = new Date("2026-11-03T05:00:00Z");
    expect(dueAt(start, 0)).toEqual(start);
    expect(dueAt(start, 2)).toEqual(new Date(start.getTime() + 7 * DAY));
    expect(dueAt(start, OUTREACH_STEPS.length)).toBeNull();
  });

  it("skips a step the lead has no contact detail for", () => {
    expect(canRun(OUTREACH_STEPS[0], { email: null })).toBe(false);
    // No phone: the day-3 WhatsApp is skipped and the day-7 email runs instead.
    expect(nextRunnable(1, { email: "a@b.c", phoneKey: null })).toBe(2);
    // Neither: nothing is runnable at all.
    expect(nextRunnable(0, { email: null, phoneKey: null })).toBe(3);
  });

  it("runs out rather than looping", () => {
    expect(nextRunnable(OUTREACH_STEPS.length, lead)).toBeNull();
  });
});

describe("the pitch", () => {
  it("refuses an area with no audience to sell", () => {
    expect(pitch.isSendable(lead)).toBe(true);
    expect(pitch.isSendable({ ...lead, sessionsInArea: 0 })).toBe(false);
    expect(pitch.isSendable({ ...lead, sessionsInArea: 900 })).toBe(false);
  });

  it("puts the real number and the owner's name in the mail", () => {
    const text = pitch.body(lead, from, false);
    expect(text).toContain("Rajesh bhai");
    expect(text).toContain("9,000");
    expect(text).toContain("Adajan");
    expect(text).toContain("Gym");
  });

  it("falls back to the business name when nobody is named", () => {
    expect(pitch.body({ ...lead, ownerName: null }, from, false)).toContain("Iron Fitness");
  });

  it("writes the follow-up as a reply on the same subject", () => {
    expect(pitch.subject(lead, true)).toBe(`Re: ${pitch.subject(lead, false)}`);
    expect(pitch.body(lead, from, true)).toMatch(/ના|no/);
  });

  it("always says how to stop it, in the language it was written in", () => {
    expect(pitch.html(pitch.body(lead, from, false), "gu")).toContain("બંધ");
    expect(pitch.html(pitch.body({ ...lead, lang: "en" }, from, false), "en")).toContain("stop");
  });

  it("escapes a business name into the HTML", () => {
    const html = pitch.html(pitch.body({ ...lead, business: "A & B <Gym>" }, from, false), "gu");
    expect(html).toContain("A &amp; B &lt;Gym&gt;");
    expect(html).not.toContain("<Gym>");
  });

  it("builds a wa.me link with the message already written", () => {
    const link = pitch.whatsappLink("919876543210", pitch.whatsappText(lead, from));
    expect(link.startsWith("https://wa.me/919876543210?text=")).toBe(true);
    expect(decodeURIComponent(link)).toContain("Iron Fitness");
  });
});

describe("the sending account", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
    resetOutreachMailer();
  });

  it("refuses the account that sends guest OTPs", () => {
    process.env.SMTP_USER = "bills@jamavat.in";
    process.env.OUTREACH_SMTP_USER = "BILLS@jamavat.in";
    process.env.OUTREACH_SMTP_PASS = "x";
    expect(mailerProblem()).toBe("shared-account");
  });

  it("needs its own credentials", () => {
    delete process.env.OUTREACH_SMTP_USER;
    expect(mailerProblem()).toBe("unset");
  });

  it("is happy with a separate address", () => {
    process.env.SMTP_USER = "bills@jamavat.in";
    process.env.OUTREACH_SMTP_USER = "partner@jamavat.in";
    process.env.OUTREACH_SMTP_PASS = "x";
    expect(mailerProblem()).toBeNull();
  });

  it("ramps the daily cap so a fresh account is not throttled", () => {
    process.env.OUTREACH_DAILY_CAP = "30";
    process.env.OUTREACH_STARTED_ON = "2026-11-02";
    expect(dailyCap(new Date("2026-11-02T06:00:00Z"))).toBe(10);
    expect(dailyCap(new Date("2026-11-05T06:00:00Z"))).toBe(20);
    expect(dailyCap(new Date("2026-11-12T06:00:00Z"))).toBe(30);
  });

  it("starts at ten when nobody set the start day", () => {
    process.env.OUTREACH_DAILY_CAP = "40";
    delete process.env.OUTREACH_STARTED_ON;
    expect(dailyCap()).toBe(10);
  });
});

describe("the morning digest", () => {
  const summary: OutreachRunSummary = {
    emailsSent: 12,
    emailsFailed: 1,
    whatsappSent: 5,
    whatsappFailed: 0,
    replied: 2,
    closed: 3,
    capLeft: 8,
    manual: [
      { id: "1", business: "Iron Fitness", category: "Gym", area: "Adajan", channel: "whatsapp", link: "https://wa.me/919876543210?text=hi", message: "hi" },
      { id: "2", business: "Smile Dental", category: "Dental clinic", area: "Vesu", channel: "visit" },
    ],
  };

  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("carries the WhatsApp link and says the visit is on foot", () => {
    const html = digestHtml(summary, "2026-11-05");
    expect(html).toContain("https://wa.me/919876543210?text=hi");
    expect(html).toContain("Go in person");
    expect(html).toContain("8 more emails allowed today");
  });

  it("shouts when outreach is pointed at the product's own account", () => {
    process.env.SMTP_USER = "bills@jamavat.in";
    process.env.OUTREACH_SMTP_USER = "bills@jamavat.in";
    process.env.OUTREACH_SMTP_PASS = "x";
    expect(digestHtml(summary, "2026-11-05")).toContain("Stopped on purpose");
  });

  it("has a plain-text twin with the same links", () => {
    expect(digestText(summary, "2026-11-05")).toContain("https://wa.me/919876543210?text=hi");
  });
});

describe("the WhatsApp template", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("fills every placeholder the approved body declares", () => {
    const rendered = renderTemplate(lead);
    expect(rendered).not.toMatch(/\{\{\d\}\}/);
    expect(rendered).toContain("Rajesh bhai");
    expect(rendered).toContain("Adajan");
    expect(rendered).toContain("9,000");
    expect(rendered).toContain("Gym");
  });

  it("passes the parameters in the order the template numbers them", () => {
    expect(templateParams(lead)).toEqual(["Rajesh bhai", "Adajan", "9,000", "Gym"]);
    expect(TEMPLATE_BODY.match(/\{\{\d\}\}/g)).toHaveLength(4);
  });

  it("tells the sponsor how to stop it, like the email does", () => {
    expect(renderTemplate(lead)).toContain("બંધ");
  });

  it("will not send on the number the restaurants use", () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "t";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "support";
    process.env.WHATSAPP_OUTREACH_TEMPLATE = "sponsor_pitch";
    delete process.env.WHATSAPP_OUTREACH_PHONE_NUMBER_ID;
    expect(whatsappProblem()).toBe("shared-number");
  });

  it("is not fooled by the outreach id being set to the support number", () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "t";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "133791512";
    process.env.WHATSAPP_OUTREACH_TEMPLATE = "sponsor_pitch";
    process.env.WHATSAPP_OUTREACH_PHONE_NUMBER_ID = "133791512";
    delete process.env.WHATSAPP_OUTREACH_ALLOW_SHARED_NUMBER;
    expect(whatsappProblem()).toBe("shared-number");
  });

  it("shares the support number only when the owner says so in so many words", () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "t";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "133791512";
    process.env.WHATSAPP_OUTREACH_TEMPLATE = "sponsor_pitch";
    process.env.WHATSAPP_OUTREACH_PHONE_NUMBER_ID = "133791512";
    process.env.WHATSAPP_OUTREACH_ALLOW_SHARED_NUMBER = "yes";
    expect(whatsappProblem()).toBe("shared-number");
    process.env.WHATSAPP_OUTREACH_ALLOW_SHARED_NUMBER = "true";
    expect(whatsappProblem()).toBeNull();
  });

  it("will not send without an approved template", () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "t";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "support";
    delete process.env.WHATSAPP_OUTREACH_TEMPLATE;
    expect(whatsappProblem()).toBe("no-template");
  });

  it("is happy on a separate number with a template", () => {
    process.env.WHATSAPP_ACCESS_TOKEN = "t";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "support";
    process.env.WHATSAPP_OUTREACH_TEMPLATE = "sponsor_pitch";
    process.env.WHATSAPP_OUTREACH_PHONE_NUMBER_ID = "outreach";
    expect(whatsappProblem()).toBeNull();
  });
});

describe("email open tracking", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("signs the pixel so one lead's id cannot mark another as read", () => {
    process.env.OUTREACH_TRACKING_SECRET = "s3cret";
    const id = "6530f0000000000000000001";
    expect(isValidOpen(id, 0, signOpen(id, 0))).toBe(true);
    expect(isValidOpen(id, 0, signOpen(id, 2))).toBe(false);
    expect(isValidOpen("6530f0000000000000000002", 0, signOpen(id, 0))).toBe(false);
  });

  it("refuses everything when no secret is set, rather than trusting the URL", () => {
    delete process.env.OUTREACH_TRACKING_SECRET;
    delete process.env.CRON_SECRET;
    expect(isValidOpen("a", 0, "deadbeef")).toBe(false);
    expect(openPixelUrl("https://jamavat.in", "a", 0)).toBeNull();
  });

  it("builds a pixel URL under /api, which robots.txt already blocks", () => {
    process.env.OUTREACH_TRACKING_SECRET = "s3cret";
    expect(openPixelUrl("https://jamavat.in/", "abc", 1)).toMatch(/^https:\/\/jamavat\.in\/api\/o\/abc\/1\/[0-9a-f]{16}\.gif$/);
  });
});

describe("pasting a sheet", () => {
  it("reads the columns by name, in any order", () => {
    const rows = parseCsv("area,business,email\nAdajan,Iron Fitness,owner@iron.in");
    expect(rows).toEqual([{ area: "Adajan", business: "Iron Fitness", email: "owner@iron.in" }]);
  });

  it("survives a comma inside a quoted field", () => {
    const rows = parseCsv('business,notes\n"Shah & Sons, Adajan","big board outside, spends on ads"');
    expect(rows[0].business).toBe("Shah & Sons, Adajan");
    expect(rows[0].notes).toBe("big board outside, spends on ads");
  });

  it("handles a doubled quote and ignores blank lines", () => {
    const rows = parseCsv('business\n"The ""Fit"" Club"\n\n');
    expect(rows).toHaveLength(1);
    expect(rows[0].business).toBe('The "Fit" Club');
  });

  it("drops a row with no business name — there is nothing to file it under", () => {
    expect(toRow({ business: "   ", email: "a@b.c" })).toBeNull();
    expect(toRow({ business: "Iron Fitness" })?.business).toBe("Iron Fitness");
  });

  it("defaults the pitch language to ગુજરાતી", () => {
    expect(toRow({ business: "X" })?.lang).toBe("gu");
    expect(toRow({ business: "X", lang: "en" })?.lang).toBe("en");
  });

  it("normalises a phone to the shape an inbound WhatsApp arrives in", () => {
    expect(phoneKeyOf("9876543210")).toBe("919876543210");
    expect(phoneKeyOf("+91 98765 43210")).toBe("919876543210");
    expect(phoneKeyOf("098765 43210")).toBe("919876543210");
    expect(phoneKeyOf("12345")).toBeUndefined();
    expect(phoneKeyOf(undefined)).toBeUndefined();
  });
});

describe("the downloadable sheet", () => {
  it("round-trips: every column the template offers is read back", () => {
    const rows = parseCsv(templateCsv());
    expect(rows).toHaveLength(2);
    for (const column of LEAD_COLUMNS) expect(Object.keys(rows[0])).toContain(column.name);
    const lead = toRow(rows[0]);
    expect(lead).toMatchObject({ business: "Iron Fitness", category: "Gym", area: "Adajan", ownerName: "Rajesh bhai", sessionsInArea: 9000, lang: "gu" });
    expect(lead?.maps).toBe("gym in Adajan Surat");
  });

  it("survives the BOM Excel needs, so a downloaded sheet pastes back", () => {
    const rows = parseCsv("\uFEFF" + templateCsv());
    expect(toRow(rows[0])?.business).toBe("Iron Fitness");
  });

  it("quotes only what has to be quoted, and escapes a quote", () => {
    const csv = toCsv([{ business: 'Shah & Sons, Adajan', notes: 'said "maybe"', area: "Adajan" }]);
    expect(csv).toContain('"Shah & Sons, Adajan"');
    expect(csv).toContain('"said ""maybe"""');
    expect(csv).toContain(",Adajan,");
    // And it reads back as what went in.
    expect(parseCsv(csv)[0].notes).toBe('said "maybe"');
  });

  it("keeps a row with no email, which is the common case", () => {
    const second = parseCsv(templateCsv())[1];
    expect(second.email).toBe("");
    expect(toRow(second)?.email).toBeUndefined();
    expect(toRow(second)?.business).toBe("Smile Dental");
  });
});
