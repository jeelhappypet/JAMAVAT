import { describe, expect, it } from "vitest";
import { HERO, KEYWORD_PAGES, FAQS, internationalPhone, pick } from "@/lib/site/content";
import { languageAlternates, sitePath } from "@/lib/site/urls";

describe("website addresses", () => {
  it("gives each language its own address", () => {
    expect(sitePath("en", "/")).toBe("/");
    expect(sitePath("gu", "/")).toBe("/gu");
    expect(sitePath("en", "/pricing")).toBe("/pricing");
    expect(sitePath("gu", "/pricing")).toBe("/gu/pricing");
  });

  it("points every page at its translation", () => {
    const alternates = languageAlternates("/qr-code-ordering-system");
    expect(alternates.canonical).toMatch(/\/qr-code-ordering-system$/);
    expect(alternates.languages["gu-IN"]).toMatch(/\/gu\/qr-code-ordering-system$/);
    expect(alternates.languages["x-default"]).toBe(alternates.canonical);
  });

  it("makes each ગુજરાતી page its own canonical — pointing it at the English page gets it dropped from Google", () => {
    expect(languageAlternates("/", "gu").canonical).toMatch(/\/gu$/);
    expect(languageAlternates("/pricing", "gu").canonical).toMatch(/\/gu\/pricing$/);
  });
});

describe("website copy", () => {
  it("is written in both languages everywhere", () => {
    const texts = [
      ...FAQS.flatMap((faq) => [faq.q, faq.a]),
      ...KEYWORD_PAGES.flatMap((page) => [page.title, page.description, page.heading, page.intro, ...page.sections.flatMap((s) => [s.heading, s.body])]),
    ];
    for (const text of texts) {
      expect(text.en.trim().length, text.en).toBeGreaterThan(0);
      expect(text.gu.trim().length, text.en).toBeGreaterThan(0);
    }
  });

  it("keeps each keyword page about its own thing, with a title search results can show", () => {
    const slugs = KEYWORD_PAGES.map((page) => page.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const page of KEYWORD_PAGES) {
      for (const lang of ["en", "gu"] as const) {
        expect(pick(page.title, lang).length, page.slug).toBeLessThanOrEqual(70);
        expect(pick(page.description, lang).length, page.slug).toBeGreaterThan(70);
        // Google cuts a snippet at roughly 155 characters.
        expect(pick(page.description, lang).length, page.slug).toBeLessThanOrEqual(155);
      }
      expect(pick(page.label, "en").length).toBeGreaterThan(0);
      expect(pick(page.label, "gu").length).toBeGreaterThan(0);
      // Its own heading, not the home page's.
      expect(page.heading.en).not.toBe(page.title.en);
    }
  });
});

describe("home page snippet", () => {
  it("leads with the brand and fits in a search result", () => {
    for (const lang of ["en", "gu"] as const) {
      expect(pick(HERO.metaTitle, lang)).toMatch(/Jamavat/);
      expect(pick(HERO.metaDescription, lang).length).toBeLessThanOrEqual(155);
    }
  });

  it("writes phone numbers in international form", () => {
    expect(internationalPhone("917984020642")).toBe("+917984020642");
    expect(internationalPhone("98765 43210")).toBe("+919876543210");
  });
});
