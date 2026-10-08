import { describe, expect, it } from "vitest";
import { MESSAGES, makeTranslator, type MessageKey } from "@/lib/i18n/messages";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe("messages", () => {
  const keys = Object.keys(MESSAGES.en) as MessageKey[];

  it("has no empty text in either language", () => {
    for (const key of keys) {
      expect(MESSAGES.en[key].trim(), key).not.toBe("");
      expect(MESSAGES.gu[key].trim(), key).not.toBe("");
    }
  });

  it("uses the same {placeholders} in English and Gujarati", () => {
    for (const key of keys) expect(placeholders(MESSAGES.gu[key]), key).toEqual(placeholders(MESSAGES.en[key]));
  });

  it("fills placeholders and leaves unknown ones visible", () => {
    const t = makeTranslator("en");
    expect(t("parcel.token", { n: 7 })).toContain("7");
    expect(t("parcel.token")).toContain("{n}");
  });
});
