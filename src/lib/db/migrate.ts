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
import { SubscriptionPayment } from "@/models/SubscriptionPayment";
import { Table } from "@/models/Table";
import { WhatsAppConversation } from "@/models/WhatsAppConversation";
import { WhatsAppCustomer } from "@/models/WhatsAppCustomer";
import { WhatsAppMessage } from "@/models/WhatsAppMessage";
import { Counter } from "@/models/Counter";
import { slugify } from "@/lib/utils/slug";
import { NO_PRIOR_END } from "@/lib/subscription";

const TENANCY = "tenancy-v1";
const TRIAL_ANCHOR = "trial-anchor-v1";
const OLD_INDEXES_AGAIN = "old-indexes-v2";
const LOCK_MS = 60_000;

/** Every one-time migration below, in the order `runMigrations` applies them. */
const MIGRATION_IDS = [TENANCY, TRIAL_ANCHOR, OLD_INDEXES_AGAIN];

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

/**
 * Every cold start used to ask Mongo three times — once per migration —
 * whether it was already done, and the three questions went one after the
 * other. That is three round trips before the request's own first read, on
 * the slowest request a staff member makes (the one right after login).
 * One query answers all three; the migrations themselves only run on the
 * cold start that finds something left to do, which after launch is none.
 */
export async function runMigrations(db: mongo.Db): Promise<void> {
  const done = await db
    .collection<MigrationDoc>("migrations")
    .find({ _id: { $in: MIGRATION_IDS }, state: "done" })
    .project<{ _id: string }>({ _id: 1 })
    .toArray();
  if (done.length === MIGRATION_IDS.length) return;

  // Order matters: a legacy restaurant created by the first migration needs a
  // `paidUntil` for the second to read.
  await migrateToTenancy(db);
  await backfillTrialEndsAt(db);
  await dropOldIndexesAgain(db);
}

interface MigrationDoc {
  _id: string;
  state: "running" | "done";
  lockedUntil?: Date;
  restaurantId?: unknown;
  doneAt?: Date;
}

/**
 * Claims the named one-time migration, or waits for whoever already has it.
 * Returns false (nothing to do) once it's `"done"` — the shared half of
 * every migration below, so each one only has to write its own body.
 */
async function claimMigration(migrations: mongo.Collection<MigrationDoc>, id: string): Promise<boolean> {
  const deadline = Date.now() + 2 * LOCK_MS;
  while (true) {
    const current = await migrations.findOne({ _id: id });
    if (current?.state === "done") return false;
    const now = new Date();
    try {
      const locked = await migrations.findOneAndUpdate(
        { _id: id, state: { $ne: "done" }, $or: [{ lockedUntil: { $exists: false } }, { lockedUntil: { $lt: now } }] },
        { $set: { state: "running", lockedUntil: new Date(now.getTime() + LOCK_MS) } },
        { upsert: true, returnDocument: "after" }
      );
      if (locked) return true;
    } catch (error) {
      // Upsert lost the race on _id: someone else holds the lock.
      if (!(typeof error === "object" && error && "code" in error && error.code === 11000)) throw error;
    }
    if (Date.now() > deadline) throw new Error(`[migrate] ${id} is still locked by another instance`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
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
  if (!(await claimMigration(migrations, TENANCY))) return;

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

  await dropOldIndexes(db);

  const counters = db.collection<{ _id: string; seq: number }>(Counter.collection.collectionName);
  for (const counter of await counters.find({ _id: { $not: /:/ } }).toArray()) {
    await counters.updateOne({ _id: `${rid}:${counter._id}` }, { $max: { seq: counter.seq } }, { upsert: true });
  }

  await migrations.updateOne({ _id: TENANCY }, { $set: { state: "done", doneAt: new Date(), restaurantId: rid }, $unset: { lockedUntil: "" } });
  console.info(`[migrate] data moved to restaurant ${String(rid)}`);
}

async function dropOldIndexes(db: mongo.Db): Promise<void> {
  for (const [model, index] of OLD_INDEXES) {
    try {
      await db.collection(model.collection.collectionName).dropIndex(index);
      console.info(`[migrate] dropped old unique index ${model.collection.collectionName}.${index}`);
    } catch {
      // Not there (fresh collection or already dropped).
    }
  }
}

/**
 * The single-restaurant unique indexes again, in every database — not only
 * the ones `migrateToTenancy` converted. Any server still running the old
 * schema (an old preview deployment, a stale local checkout) re-creates
 * them on connect, and a global `billNo_1` then fails a restaurant's settle
 * whenever another restaurant already has that bill number.
 */
export async function dropOldIndexesAgain(db: mongo.Db): Promise<void> {
  const migrations = db.collection<MigrationDoc>("migrations");
  if (!(await claimMigration(migrations, OLD_INDEXES_AGAIN))) return;
  await dropOldIndexes(db);
  await migrations.updateOne({ _id: OLD_INDEXES_AGAIN }, { $set: { state: "done", doneAt: new Date() }, $unset: { lockedUntil: "" } });
}

/**
 * One-time backfill for `Restaurant.trialEndsAt`, for restaurants that
 * predate it (new ones get it reactively — `captureTrialAnchor` in
 * lib/hq/restaurants.ts, called right before a restaurant's first-ever
 * payment). Reconstructs the anchor while payment history is still intact:
 *
 * - no payments yet → today's `paidUntil` is exactly the trial end, nothing
 *   has moved it;
 * - payments exist → the oldest one's `paidAt` (there's no record of the
 *   exact value before it, so this is the closest approximation — it only
 *   affects what "Paid until" recalculates to if that oldest payment is
 *   later edited or deleted);
 * - neither → `NO_PRIOR_END`, same as a brand-new restaurant with no trial.
 *
 * Runs on every DB connect like `migrateToTenancy`, immediately after it (so
 * a legacy restaurant it just created already has a `paidUntil` to read
 * here).
 */
export async function backfillTrialEndsAt(db: mongo.Db): Promise<void> {
  const migrations = db.collection<MigrationDoc>("migrations");
  if (!(await claimMigration(migrations, TRIAL_ANCHOR))) return;

  const restaurants = db.collection(Restaurant.collection.collectionName);
  const payments = db.collection(SubscriptionPayment.collection.collectionName);

  const candidates = await restaurants.find({ trialEndsAt: { $exists: false } }).project({ paidUntil: 1 }).toArray();
  for (const restaurant of candidates) {
    const [oldest] = await payments.find({ restaurantId: restaurant._id }).sort({ paidAt: 1 }).limit(1).toArray();
    const anchor = oldest?.paidAt ?? restaurant.paidUntil ?? NO_PRIOR_END;
    await restaurants.updateOne({ _id: restaurant._id }, { $set: { trialEndsAt: anchor } });
  }

  await migrations.updateOne({ _id: TRIAL_ANCHOR }, { $set: { state: "done", doneAt: new Date() }, $unset: { lockedUntil: "" } });
}
