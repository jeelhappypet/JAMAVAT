import { describe, expect, it } from "vitest";
import { isValidSlug, slugify } from "@/lib/utils/slug";

describe("restaurant links", () => {
  it("makes a link out of a restaurant's name", () => {
    expect(slugify("Kiran's Thali House")).toBe("kirans-thali-house");
    expect(slugify("  Café  Mocha  ")).toBe("cafe-mocha");
    expect(slugify("Hotel 24x7!!")).toBe("hotel-24x7");
  });

  it("gives nothing for a name with no Latin letters, so the caller asks for one", () => {
    expect(slugify("જમાવટ")).toBe("");
  });

  it("refuses links that would clash with Jamavat's own pages", () => {
    expect(isValidSlug("hq")).toBe(false);
    expect(isValidSlug("api")).toBe(false);
    expect(isValidSlug("login")).toBe(false);
    expect(isValidSlug("t")).toBe(false);
  });

  it("accepts plain lower-case links only", () => {
    expect(isValidSlug("kirans-thali-house")).toBe(true);
    expect(isValidSlug("ab")).toBe(false);
    expect(isValidSlug("Kirans")).toBe(false);
    expect(isValidSlug("-kiran")).toBe(false);
    expect(isValidSlug("kiran-")).toBe(false);
    expect(isValidSlug("kiran--thali")).toBe(false);
    expect(isValidSlug("kiran thali")).toBe(false);
  });
});
