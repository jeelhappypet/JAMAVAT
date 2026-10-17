import { describe, expect, it } from "vitest";
import { digitsOf, inquirySchema } from "@/lib/validation/inquiry";
import { tooManyFrom } from "@/lib/site/inquiry";

const base = { name: "Kiran", phone: "98765 43210" };

describe("demo request validation", () => {
  it("needs a name and a real mobile number", () => {
    expect(inquirySchema.safeParse(base).success).toBe(true);
    expect(inquirySchema.safeParse({ ...base, phone: "+91 98765 43210" }).success).toBe(true);
    expect(inquirySchema.safeParse({ ...base, name: "  " }).success).toBe(false);
    expect(inquirySchema.safeParse({ ...base, phone: "12345" }).success).toBe(false);
    // Indian mobiles start 6–9; a landline-looking number is a typo we'd rather catch on the page.
    expect(inquirySchema.safeParse({ ...base, phone: "1234567890" }).success).toBe(false);
  });

  it("keeps only the last ten digits, however the number was typed", () => {
    expect(digitsOf("+91 98765-43210")).toBe("9876543210");
    expect(digitsOf("098765 43210")).toBe("9876543210");
  });

  it("drops empty optional fields instead of storing blanks", () => {
    const parsed = inquirySchema.parse({ ...base, city: "   ", message: "" });
    expect(parsed.city).toBeUndefined();
    expect(parsed.message).toBeUndefined();
  });

  it("checks the email only when one was given", () => {
    expect(inquirySchema.safeParse({ ...base, email: "" }).success).toBe(true);
    expect(inquirySchema.safeParse({ ...base, email: "kiran@thali.com" }).success).toBe(true);
    expect(inquirySchema.safeParse({ ...base, email: "kiran@" }).success).toBe(false);
  });

  it("carries the honeypot through, so the route can drop a bot silently", () => {
    expect(inquirySchema.parse({ ...base, website: "http://spam" }).website).toBe("http://spam");
  });

  it("defaults to English when the page didn't say", () => {
    expect(inquirySchema.parse(base).lang).toBe("en");
    expect(inquirySchema.parse({ ...base, lang: "gu" }).lang).toBe("gu");
  });
});

describe("inquiry rate limit", () => {
  it("allows a handful an hour from one address, then stops", () => {
    const now = Date.now();
    const ip = `test-${now}`;
    for (let i = 0; i < 5; i += 1) expect(tooManyFrom(ip, now)).toBe(false);
    expect(tooManyFrom(ip, now)).toBe(true);
    // An hour later the same address is welcome again.
    expect(tooManyFrom(ip, now + 61 * 60 * 1000)).toBe(false);
  });

  it("counts each address on its own", () => {
    const now = Date.now();
    for (let i = 0; i < 6; i += 1) tooManyFrom(`flooder-${now}`, now);
    expect(tooManyFrom(`someone-else-${now}`, now)).toBe(false);
  });
});
