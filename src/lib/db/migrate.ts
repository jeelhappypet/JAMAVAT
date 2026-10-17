import type { Model, mongo } from "mongoose";
import { Bill } from "@/models/Bill";
import { Category } from "@/models/Category";
import { GuestSession } from "@/models/GuestSession";
import { Menu } from "@/models/Menu";
import { MenuItem } from "@/models/MenuItem";
import { Order } from "@/models/Order";
import { Restaurant } from "@/models/Restaurant";
import { Seat } from "@/models/Seat";
import { Staff } from "@/models/Staff";
import { Table } from "@/models/Table";
import { WhatsAppConversation } from "@/models/WhatsAppConversation";
import { WhatsAppCustomer } from "@/models/WhatsAppCustomer";
import { WhatsAppMessage } from "@/models/WhatsAppMessage";
import { Counter } from "@/models/Counter";
import { slugify } from "@/lib/utils/slug";

const TENANCY = "tenancy-v1";
const LOCK_MS = 60_000;

/** Every collection whose documents belong to one restaurant. */
const TENANT_MODELS: Model<unknown>[] = [Menu, Category, MenuItem, Order, Bill, Staff, Table, Seat, GuestSession, WhatsAppCustomer, WhatsAppConversation, WhatsAppMessage];

/** Single-restaurant unique indexes that would stop a second restaurant from having staff "Ravi" or token 1. */
const OLD_INDEXES: [Model<unknown>, string][] = [
  [Staff, "name_1"],
  [Order, "businessDate_1_tokenNumber_1"],
  [Bill, "billNo_1"],
  [Menu, "legacyKey_1"],
  [Category, "legacyKey_1"],
  [WhatsAppCustomer, "whatsappWaId_1"],
];

interface MigrationDoc {
  _id: string;
  state: "running" | "done";
  lockedUntil?: Date;
  restaurantId?: unknown;
  doneAt?: Date;
}

/**
 * Turns the single-restaurant database into the first tenant, once. Runs on
 * the first DB connect of every server instance; after it's done that costs
 * one indexed read. Safe with many cold starts at once: one instance takes
 * the lock, the others wait for "done". Every step is idempotent, so an
 * instance that dies half-way is simply redone by the next one.
 *
 * - the existing Restaurant doc (or a new one, if setup never saved a name)
 *   gets a slug (LEGACY_RESTAURANT_SLUG, else from its name), ACTIVE with no
 *   end date, and the WhatsApp number from the env;
 * - every tenant document without a restaurantId gets this restaurant's;
 * - the old global unique indexes are dropped (the per-restaurant ones are
 *   built by Mongoose from the schemas);
 * - today's token counter and the bill counter continue under the new ids,
 *   so tokens don't restart mid-day.
 */
export async function migrateToTenancy(db: mongo.Db): Promise<void> {
  const migrations = db.collection<MigrationDoc>("migrations");
  const deadline = Date.now() + 2 * LOCK_MS;

  while (true) {
    const current = await migrations.findOne({ _id: TENANCY });
    if (current?.state === "done") return;
    const now = new Date();
    try {
      const locked = await migrations.findOneAndUpdate(
        { _id: TENANCY, state: { $ne: "done" }, $or: [{ lockedUntil: { $exists: false } }, { lockedUntil: { $lt: now } }] },
        { $set: { state: "running", lockedUntil: new Date(now.getTime() + LOCK_MS) } },
        { upsert: true, returnDocument: "after" }
      );
      if (locked) break;
    } catch (error) {
      // Upsert lost the race on _id: someone else holds the lock.
      if (!(typeof error === "object" && error && "code" in error && error.code === 11000)) throw error;
    }
    if (Date.now() > deadline) throw new Error("[migrate] tenancy migration is still locked by another instance");
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const restaurants = db.collection(Restaurant.collection.collectionName);
  const staffCount = await db.collection(Staff.collection.collectionName).countDocuments({}, { limit: 1 });
  let legacy = await restaurants.findOne({}, { sort: { createdAt: 1, _id: 1 } });

  if (!legacy && staffCount === 0) {
    // A brand-new database: nothing to migrate, restaurants come from HQ.
    await migrations.updateOne({ _id: TENANCY }, { $set: { state: "done", doneAt: new Date() }, $unset: { lockedUntil: "" } });
    return;
  }

  if (!legacy) {
    const inserted = await restaurants.insertOne({ name: "Restaurant", createdAt: new Date(), updatedAt: new Date() });
    legacy = await restaurants.findOne({ _id: inserted.insertedId });
  }
  const rid = legacy!._id;

  if (!legacy!.slug) {
    const wanted = (process.env.LEGACY_RESTAURANT_SLUG || slugify(String(legacy!.name ?? "")) || "restaurant").toLowerCase();
    const taken = await restaurants.findOne({ slug: wanted, _id: { $ne: rid } });
    await restaurants.updateOne({ _id: rid }, { $set: { slug: taken ? `${wanted}-${String(rid).slice(-4)}` : wanted } });
  }
  await restaurants.updateOne(
    { _id: rid, legacy: { $ne: true } },
    {
      $set: {
        legacy: true,
        status: "ACTIVE",
        billingCycle: "MONTHLY",
        graceDays: 7,
        previousSlugs: [],
        ...(process.env.WHATSAPP_PHONE_NUMBER_ID ? { whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID } : {}),
      },
    }
  );

  for (const model of TENANT_MODELS) {
    await db.collection(model.collection.collectionName).updateMany({ restaurantId: { $exists: false } }, { $set: { restaurantId: rid } });
  }

  for (const [model, index] of OLD_INDEXES) {
    try {
      await db.collection(model.collection.collectionName).dropIndex(index);
    } catch {
      // Not there (fresh collection or already dropped).
    }
  }

  const counters = db.collection<{ _id: string; seq: number }>(Counter.collection.collectionName);
  for (const counter of await counters.find({ _id: { $not: /:/ } }).toArray()) {
    await counters.updateOne({ _id: `${rid}:${counter._id}` }, { $max: { seq: counter.seq } }, { upsert: true });
  }

  await migrations.updateOne({ _id: TENANCY }, { $set: { state: "done", doneAt: new Date(), restaurantId: rid }, $unset: { lockedUntil: "" } });
  console.info(`[migrate] data moved to restaurant ${String(rid)}`);
}
