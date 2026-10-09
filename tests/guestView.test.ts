import { describe, expect, it } from "vitest";
import { guestUrlFor, startView, viewFromSearch } from "@/lib/guest/view";
import type { GuestStateDTO } from "@/types";

const state = (over: Partial<GuestStateDTO> = {}): GuestStateDTO =>
  ({ seatCode: "4A", lock: "mine", orders: [], ...over }) as GuestStateDTO;
const order = (status: string) => ({ id: "o1", status }) as GuestStateDTO["orders"][number];

describe("guest step in the URL", () => {
  it("reads the steps it knows and ignores anything else", () => {
    expect(viewFromSearch("cart")).toBe("cart");
    expect(viewFromSearch("verify")).toBe("verify");
    expect(viewFromSearch("status")).toBe("status");
    expect(viewFromSearch("busy")).toBe("busy");
    expect(viewFromSearch(undefined)).toBeUndefined();
    expect(viewFromSearch("checkout")).toBeUndefined();
    // "menu" is the bare URL, never a parameter.
    expect(viewFromSearch("menu")).toBeUndefined();
  });

  it("keeps the QR's path and leaves the menu bare", () => {
    expect(guestUrlFor("/t/abc", "menu")).toBe("/t/abc");
    expect(guestUrlFor("/t/abc", "cart")).toBe("/t/abc?v=cart");
  });
});

describe("where a scanned QR starts", () => {
  it("opens the menu, even with an order already cooking", () => {
    // The bare URL is what the back button returns to: resolving it to the
    // "order placed" screen used to trap the guest there.
    expect(startView(state())).toBe("menu");
    expect(startView(state({ orders: [order("PENDING")] }))).toBe("menu");
    expect(startView(state({ orders: [order("READY")] }))).toBe("menu");
  });

  it("thanks a guest whose table was just settled, and blocks a taken QR", () => {
    expect(startView(state({ lock: "free", ended: { reason: "SETTLED" } }))).toBe("status");
    expect(startView(state({ lock: "taken" }))).toBe("busy");
    // Still seated: the thank-you belongs to the previous sitting, not this one.
    expect(startView(state({ lock: "mine", ended: { reason: "SETTLED" } }))).toBe("menu");
  });
});
