import { describe, expect, it } from "vitest";
import { KEYWORD_PAGES, FAQS, pick } from "@/lib/site/content";
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
        expect(pick(page.description, lang).length, page.slug).toBeLessThanOrEqual(185);
      }
      // Its own heading, not the home page's.
      expect(page.heading.en).not.toBe(page.title.en);
    }
  });
});
