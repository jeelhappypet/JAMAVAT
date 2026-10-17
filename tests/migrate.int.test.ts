import mongoose from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateToTenancy } from "@/lib/db/migrate";

/**
 * The one-time migration that turns the single-restaurant database into the
 * first tenant. It rewrites live data, so it is exercised against a throwaway
 * database seeded to look like v2 did before tenancy:
 *
 *   MONGODB_TEST_URI="mongodb+srv://…/jamavat_migrate_test" npx vitest run tests/migrate.int.test.ts
 *
 * Without that variable the suite skips, so `npm test` still needs no database.
 */
const uri = process.env.MONGODB_TEST_URI;
const describeIfDb = uri ? describe : describe.skip;

describeIfDb("tenancy migration", () => {
  const db = () => mongoose.connection.db!;

  beforeAll(async () => {
    process.env.LEGACY_RESTAURANT_SLUG = "";
    await mongoose.connect(uri!);
    await db().dropDatabase();

    await db().collection("restaurants").insertOne({ name: "Kiran's Thali House", createdAt: new Date(), updatedAt: new Date() });
    await db().collection("staffs").insertMany([
      { name: "Ravi", role: "ADMIN", pinHash: "x", pinSalt: "y", isActive: true, sessionVersion: 1 },
      { name: "Meena", role: "COUNTER", pinHash: "x", pinSalt: "y", isActive: true, sessionVersion: 1 },
    ]);
    await db().collection("orders").insertOne({ tokenNumber: 7, businessDate: "2026-10-18", items: [], totalAmount: 0, status: "PENDING" });
    await db().collection("bills").insertOne({ billNo: 12, businessDate: "2026-10-18", total: 0 });
    await db().collection("tables").insertOne({ name: "4" });
    await db().collection<{ _id: string; seq: number }>("counters").insertMany([
      { _id: "2026-10-18", seq: 7 },
      { _id: "bill", seq: 12 },
    ]);
    // The global unique indexes that would stop a second restaurant having its own "Ravi" or token 1.
    await db().collection("staffs").createIndex({ name: 1 }, { unique: true, name: "name_1" });
    await db().collection("orders").createIndex({ businessDate: 1, tokenNumber: 1 }, { unique: true, name: "businessDate_1_tokenNumber_1" });
    await db().collection("bills").createIndex({ billNo: 1 }, { unique: true, name: "billNo_1" });
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await db().dropDatabase();
      await mongoose.disconnect();
    }
  });

  it("makes the existing data the first restaurant, once", async () => {
    await migrateToTenancy(db());
    // A second cold start must change nothing.
    await migrateToTenancy(db());

    const restaurant = await db().collection("restaurants").findOne({});
    expect(restaurant?.slug).toBe("kirans-thali-house");
    expect(restaurant?.status).toBe("ACTIVE");
    expect(restaurant?.legacy).toBe(true);
    // No end date: the owner's own restaurant keeps working without a subscription.
    expect(restaurant?.paidUntil).toBeUndefined();

    const rid = restaurant!._id;
    for (const collection of ["staffs", "orders", "bills", "tables"]) {
      expect(await db().collection(collection).countDocuments({ restaurantId: { $exists: false } })).toBe(0);
      expect(await db().collection(collection).countDocuments({ restaurantId: rid })).toBeGreaterThan(0);
    }

    expect(await db().collection<{ _id: string; state: string }>("migrations").countDocuments({ _id: "tenancy-v1", state: "done" })).toBe(1);
  });

  it("carries today's token and bill numbers over, so they don't restart", async () => {
    const rid = String((await db().collection("restaurants").findOne({}))!._id);
    const counters = await db().collection<{ _id: string; seq: number }>("counters").find().toArray();
    const byId = new Map(counters.map((c) => [c._id, c.seq]));
    expect(byId.get(`${rid}:2026-10-18`)).toBe(7);
    expect(byId.get(`${rid}:bill`)).toBe(12);
  });

  it("drops the single-restaurant unique indexes, so two restaurants can both have Ravi and token 1", async () => {
    const names = async (collection: string) => (await db().collection(collection).indexes()).map((index) => index.name);
    expect(await names("staffs")).not.toContain("name_1");
    expect(await names("orders")).not.toContain("businessDate_1_tokenNumber_1");
    expect(await names("bills")).not.toContain("billNo_1");

    const other = new mongoose.Types.ObjectId();
    await expect(db().collection("staffs").insertOne({ restaurantId: other, name: "Ravi", role: "ADMIN" })).resolves.toBeTruthy();
    await expect(
      db().collection("orders").insertOne({ restaurantId: other, tokenNumber: 7, businessDate: "2026-10-18", items: [], totalAmount: 0, status: "PENDING" })
    ).resolves.toBeTruthy();
  });

  it("leaves a brand-new database alone — its restaurants come from HQ", async () => {
    await db().dropDatabase();
    await migrateToTenancy(db());
    expect(await db().collection("restaurants").countDocuments()).toBe(0);
    expect(await db().collection("migrations").countDocuments({ state: "done" })).toBe(1);
  });
});
