import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createBill } from "@/lib/bills";
import { dropOldIndexesAgain } from "@/lib/db/migrate";
import { Bill } from "@/models/Bill";

/**
 * Settling a table must always end in a bill. Runs against a throwaway
 * database, like the migration suite:
 *
 *   MONGODB_TEST_URI="mongodb://127.0.0.1:27017/jamavat_bills_test" npx vitest run tests/bills.int.test.ts
 */
const uri = process.env.MONGODB_TEST_URI;
const describeIfDb = uri ? describe : describe.skip;

describeIfDb("bill numbers", () => {
  const db = () => mongoose.connection.db!;
  const restaurantA = new mongoose.Types.ObjectId();
  const restaurantB = new mongoose.Types.ObjectId();

  const fields = (restaurantId: mongoose.Types.ObjectId) => ({
    restaurantId,
    businessDate: "2026-10-19",
    seatId: new mongoose.Types.ObjectId(),
    seatCode: "T1A",
    guestSessionId: new mongoose.Types.ObjectId(),
    lines: [{ name: "Heart", quantity: 2, amount: 198 }],
    itemsTotal: 198,
    discount: 0,
    total: 198,
    paymentMode: "UPI",
    settledAt: new Date(),
  });

  beforeAll(async () => {
    await mongoose.connect(uri!);
    await db().dropDatabase();
    await Bill.syncIndexes();
  });

  beforeEach(async () => {
    await db().collection("bills").deleteMany({});
    await db().collection("counters").deleteMany({});
    await db().collection("migrations").deleteMany({});
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await db().dropDatabase();
      await mongoose.disconnect();
    }
  });

  it("numbers bills one after another, per restaurant", async () => {
    const first = await createBill(String(restaurantA), fields(restaurantA));
    const second = await createBill(String(restaurantA), fields(restaurantA));
    const other = await createBill(String(restaurantB), fields(restaurantB));
    expect([first?.billNo, second?.billNo, other?.billNo]).toEqual([1, 2, 1]);
  });

  it("catches up when the counter fell behind the bills already there", async () => {
    await Bill.create({ ...fields(restaurantA), billNo: 1 });
    await Bill.create({ ...fields(restaurantA), billNo: 2 });
    // Counter missing (reset, restored backup): the next number would be 1 again.
    const bill = await createBill(String(restaurantA), fields(restaurantA));
    expect(bill?.billNo).toBe(3);
  });

  it("never bills one sitting twice", async () => {
    const sitting = fields(restaurantA);
    expect(await createBill(String(restaurantA), sitting)).not.toBeNull();
    expect(await createBill(String(restaurantA), sitting)).toBeNull();
    expect(await Bill.countDocuments({ restaurantId: restaurantA })).toBe(1);
  });

  it("drops a single-restaurant billNo index that came back, so two restaurants can both have bill 1", async () => {
    await db().collection("bills").createIndex({ billNo: 1 }, { unique: true, name: "billNo_1" });
    // The demo restaurant already has bills 1–10: every number restaurant B tries is taken.
    for (let n = 0; n < 10; n++) await createBill(String(restaurantA), fields(restaurantA));
    await expect(createBill(String(restaurantB), fields(restaurantB))).rejects.toMatchObject({ code: 11000 });

    await dropOldIndexesAgain(db());
    const bill = await createBill(String(restaurantB), fields(restaurantB));
    expect(bill).not.toBeNull();
    expect((await db().collection("bills").indexes()).map((index) => index.name)).not.toContain("billNo_1");
  });
});
