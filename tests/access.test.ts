import { describe, expect, it } from "vitest";
import { canAccessPage, homePathFor } from "@/lib/auth/access";

describe("page access", () => {
  it("sends each role to its own home", () => {
    expect(homePathFor("ADMIN")).toBe("/today");
    expect(homePathFor("COUNTER")).toBe("/counter");
    expect(homePathFor("KITCHEN")).toBe("/kitchen");
  });

  it("keeps the kitchen out of counter and admin pages", () => {
    expect(canAccessPage("KITCHEN", "/kitchen")).toBe(true);
    expect(canAccessPage("KITCHEN", "/counter")).toBe(false);
    expect(canAccessPage("KITCHEN", "/counter/seat/abc")).toBe(false);
    expect(canAccessPage("KITCHEN", "/menu")).toBe(false);
  });

  it("lets the counter run service but not admin pages", () => {
    expect(canAccessPage("COUNTER", "/counter/orders")).toBe(true);
    expect(canAccessPage("COUNTER", "/new-order")).toBe(true);
    expect(canAccessPage("COUNTER", "/reports")).toBe(false);
    expect(canAccessPage("COUNTER", "/settings")).toBe(false);
  });

  it("matches whole path segments only", () => {
    expect(canAccessPage("COUNTER", "/menus-public")).toBe(true);
    expect(canAccessPage("ADMIN", "/kitchen")).toBe(true);
  });
});
