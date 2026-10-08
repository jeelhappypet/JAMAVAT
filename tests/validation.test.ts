import { describe, expect, it } from "vitest";
import { createOrderSchema } from "@/lib/validation/order";
import { settleSchema } from "@/lib/validation/tables";
import { itemUpdateSchema, toMongoUpdate } from "@/lib/validation/menu";
import { restaurantSchema } from "@/lib/validation/staff";

describe("counter order", () => {
  const base = { items: [{ menuItemId: "a", quantity: 2 }], clientRequestId: "req-12345678" };

  it("accepts a parcel with how it was paid", () => {
    expect(createOrderSchema.parse({ ...base, paymentMode: "UPI" }).paymentMode).toBe("UPI");
  });

  it("rejects an unknown payment mode and an empty order", () => {
    expect(createOrderSchema.safeParse({ ...base, paymentMode: "CHEQUE" }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...base, items: [] }).success).toBe(false);
  });
});

describe("settle", () => {
  it("defaults to no discount and sending the email", () => {
    expect(settleSchema.parse({ sessionId: "s1", paymentMode: "CASH" })).toEqual({ sessionId: "s1", paymentMode: "CASH", discount: 0, sendEmail: true });
  });

  it("refuses a negative discount", () => {
    expect(settleSchema.safeParse({ sessionId: "s1", paymentMode: "CASH", discount: -10 }).success).toBe(false);
  });
});

describe("menu item update", () => {
  it("turns an empty Gujarati name or description into $unset", () => {
    const patch = itemUpdateSchema.parse({ nameGu: "", description: "", price: 120 });
    expect(toMongoUpdate(patch)).toEqual({ $set: { price: 120 }, $unset: { nameGu: 1, description: 1 } });
  });
});

describe("restaurant settings", () => {
  it("only takes https review links", () => {
    expect(restaurantSchema.safeParse({ restaurantName: "GuruKrupa", reviewUrl: "http://g.page/x" }).success).toBe(false);
    expect(restaurantSchema.parse({ restaurantName: "GuruKrupa", reviewUrl: "https://g.page/x" }).reviewUrl).toBe("https://g.page/x");
    expect(restaurantSchema.parse({ restaurantName: "GuruKrupa", reviewUrl: "" }).reviewUrl).toBeUndefined();
  });
});
