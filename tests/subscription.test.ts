import { describe, expect, it } from "vitest";
import { DAY_MS, canStaffSignIn, canTakeOrders, daysLeft, extendPaidUntil, subscriptionState } from "@/lib/subscription";

const at = (days: number) => new Date(Date.UTC(2026, 9, 18) + days * DAY_MS);
const now = at(0).getTime();

describe("subscription state", () => {
  it("has no end date when nothing was paid for (the owner's own restaurant)", () => {
    expect(subscriptionState({ status: "ACTIVE", paidUntil: undefined, graceDays: 7 }, now)).toBe("ok");
  });

  it("runs ok → due → expired around the paid period", () => {
    const restaurant = { status: "ACTIVE" as const, paidUntil: at(0), graceDays: 7 };
    expect(subscriptionState(restaurant, at(-1).getTime())).toBe("ok");
    expect(subscriptionState(restaurant, at(3).getTime())).toBe("due");
    expect(subscriptionState(restaurant, at(7).getTime())).toBe("due");
    expect(subscriptionState(restaurant, at(8).getTime())).toBe("expired");
  });

  it("treats a trial like a paid period", () => {
    expect(subscriptionState({ status: "TRIAL", paidUntil: at(5), graceDays: 0 }, now)).toBe("ok");
    expect(subscriptionState({ status: "TRIAL", paidUntil: at(-1), graceDays: 0 }, now)).toBe("expired");
  });

  it("lets HQ switch a restaurant off whatever the dates say", () => {
    expect(subscriptionState({ status: "SUSPENDED", paidUntil: at(30), graceDays: 7 }, now)).toBe("suspended");
    expect(subscriptionState({ status: "CANCELLED", paidUntil: undefined, graceDays: 7 }, now)).toBe("cancelled");
  });

  it("stops new orders only once the grace days are over", () => {
    expect(canTakeOrders("ok")).toBe(true);
    expect(canTakeOrders("due")).toBe(true);
    expect(canTakeOrders("expired")).toBe(false);
    expect(canTakeOrders("suspended")).toBe(false);
  });

  it("still lets staff in to settle open tables when the period ran out", () => {
    expect(canStaffSignIn("expired")).toBe(true);
    expect(canStaffSignIn("suspended")).toBe(false);
    expect(canStaffSignIn("cancelled")).toBe(false);
  });

  it("counts the days left, negative once it has passed", () => {
    expect(daysLeft(at(5), now)).toBe(5);
    expect(daysLeft(at(-2), now)).toBe(-2);
    expect(daysLeft(undefined, now)).toBeNull();
  });
});

describe("extending the paid period", () => {
  it("adds months to the current end while it is still running", () => {
    expect(extendPaidUntil(at(10), 1, at(0)).toISOString().slice(0, 10)).toBe("2026-11-28");
  });

  it("starts from today when the period has already ended", () => {
    expect(extendPaidUntil(at(-30), 1, at(0)).toISOString().slice(0, 10)).toBe("2026-11-18");
  });

  it("doesn't roll a 31st into the month after next", () => {
    expect(extendPaidUntil(new Date(Date.UTC(2026, 0, 31)), 1, new Date(Date.UTC(2026, 0, 1))).toISOString().slice(0, 10)).toBe("2026-02-28");
  });
});
