import { describe, expect, it } from "vitest";
import { appPath, appRelativePath, canAccessPage, homePathFor, slugOfPath } from "@/lib/auth/access";

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

describe("restaurant app paths", () => {
  it("puts a screen's own path under the restaurant's link", () => {
    expect(appPath("kirans-thali", "/counter")).toBe("/r/kirans-thali/counter");
    expect(appPath("kirans-thali")).toBe("/r/kirans-thali");
    expect(appPath("kirans-thali", "/")).toBe("/r/kirans-thali");
  });

  it("takes the prefix off again, so tabs can compare plain paths", () => {
    expect(appRelativePath("/r/kirans-thali/counter/orders")).toBe("/counter/orders");
    expect(appRelativePath("/r/kirans-thali")).toBe("/");
    expect(appRelativePath("/r/kirans-thali/")).toBe("/");
  });

  it("leaves Jamavat's own pages alone", () => {
    expect(appRelativePath("/")).toBe("/");
    expect(appRelativePath("/pricing")).toBe("/pricing");
    expect(appRelativePath("/t/abc123")).toBe("/t/abc123");
    expect(slugOfPath("/pricing")).toBeNull();
  });

  it("reads the slug out of a path", () => {
    expect(slugOfPath("/r/kirans-thali/counter")).toBe("kirans-thali");
    expect(slugOfPath("/r/kirans-thali")).toBe("kirans-thali");
  });
});
