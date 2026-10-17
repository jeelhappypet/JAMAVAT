/**
 * Seeds the "Jamavat Demo" restaurant: a two-kitchen menu, tables, staff and
 * a day's worth of orders. It exists for two reasons — the screenshots on
 * the Jamavat website are taken from it, so no customer's dishes or sales
 * are ever published, and it gives a link to show on a sales call.
 *
 *   node scripts/seed-demo.mjs                 # into MONGODB_URI from .env.local
 *   MONGODB_URI="…/jamavat_dev" node scripts/seed-demo.mjs
 *
 * Idempotent: it deletes and rebuilds only this demo restaurant's own data,
 * and refuses to touch a database called JAMAVATDATA (the live one) unless
 * you pass --live, which you should never need.
 */
import { readFileSync } from "node:fs";
import { createHash, randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import mongoose from "mongoose";

const scrypt = promisify(scryptCb);

const SLUG = "demo";
const NAME = "Jamavat Demo";
/** Demo logins — published on purpose, so anyone can be walked through the app. */
const STAFF = [
  { name: "Jamavat", role: "ADMIN", pin: "1111" },
  { name: "Counter", role: "COUNTER", pin: "2222" },
  { name: "Gujarati kitchen", role: "KITCHEN", pin: "3333", menu: "Gujarati" },
  { name: "Punjabi kitchen", role: "KITCHEN", pin: "4444", menu: "Punjabi" },
];

const MENUS = [
  {
    name: "Gujarati",
    nameGu: "ગુજરાતી",
    categories: [
      {
        name: "Thali",
        nameGu: "થાળી",
        items: [
          { name: "Gujarati Thali", nameGu: "ગુજરાતી થાળી", description: "2 shaak, dal, rice, 4 rotli, salad, sweet", price: 280, bestseller: true },
          { name: "Mini Thali", nameGu: "મિની થાળી", description: "1 shaak, dal, rice, 3 rotli", price: 190 },
        ],
      },
      {
        name: "Shaak",
        nameGu: "શાક",
        items: [
          { name: "Sev Tameta", nameGu: "સેવ ટમેટા", description: "Tomato curry with sev", price: 150, bestseller: true },
          { name: "Bhinda Masala", nameGu: "ભીંડા મસાલા", price: 160 },
          { name: "Undhiyu", nameGu: "ઊંધિયું", description: "Winter special", price: 220 },
        ],
      },
      {
        name: "Rotli",
        nameGu: "રોટલી",
        items: [
          { name: "Rotli", nameGu: "રોટલી", price: 20 },
          { name: "Bajra Rotlo", nameGu: "બાજરાનો રોટલો", price: 45 },
        ],
      },
      {
        name: "Sweets",
        nameGu: "મીઠાઈ",
        items: [
          { name: "Shrikhand", nameGu: "શ્રીખંડ", price: 90 },
          { name: "Gulab Jamun", nameGu: "ગુલાબ જાંબુ", description: "2 pieces", price: 70 },
        ],
      },
    ],
  },
  {
    name: "Punjabi",
    nameGu: "પંજાબી",
    categories: [
      {
        name: "Paneer",
        nameGu: "પનીર",
        items: [
          { name: "Paneer Butter Masala", nameGu: "પનીર બટર મસાલા", price: 260, bestseller: true },
          { name: "Palak Paneer", nameGu: "પાલક પનીર", price: 240 },
          { name: "Kadai Paneer", nameGu: "કડાઈ પનીર", price: 250 },
        ],
      },
      {
        name: "Breads",
        nameGu: "બ્રેડ",
        items: [
          { name: "Butter Naan", nameGu: "બટર નાન", price: 60 },
          { name: "Tandoori Roti", nameGu: "તંદૂરી રોટી", price: 35 },
          { name: "Garlic Naan", nameGu: "ગાર્લિક નાન", price: 75 },
        ],
      },
      {
        name: "Rice",
        nameGu: "રાઈસ",
        items: [
          { name: "Jeera Rice", nameGu: "જીરા રાઈસ", price: 140 },
          { name: "Veg Biryani", nameGu: "વેજ બિરયાની", price: 240 },
        ],
      },
    ],
  },
];

const TABLES = [
  { name: "1", seats: 2 },
  { name: "2", seats: 2 },
  { name: "3", seats: 2 },
  { name: "4", seats: 2 },
  { name: "5", seats: 1 },
  { name: "Garden", seats: 2, area: "Garden" },
];

function envFromFile() {
  try {
    for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
      const match = /^([A-Z_]+)=(.*)$/.exec(line.trim());
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {
    // No .env.local: MONGODB_URI must come from the environment.
  }
}

/** Must match lib/auth/pin.ts exactly, or the seeded logins won't open. */
async function hashPin(pin) {
  const pinSalt = randomBytes(16).toString("hex");
  const key = await scrypt(pin, pinSalt, 32);
  return { pinHash: key.toString("hex"), pinSalt };
}

/** Asia/Kolkata business date, the same one the app uses. */
function businessDate(at = new Date()) {
  return new Date(at.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const id = () => new mongoose.Types.ObjectId();
const token = () => randomBytes(12).toString("base64url");

async function main() {
  envFromFile();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  const dbName = uri.split("/").pop().split("?")[0];
  if (dbName === "JAMAVATDATA" && !process.argv.includes("--live")) {
    throw new Error("That's the live database. Point MONGODB_URI at a development one.");
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.info(`seeding "${NAME}" into ${dbName}`);

  const restaurants = db.collection("restaurants");
  const existing = await restaurants.findOne({ slug: SLUG });
  const restaurantId = existing?._id ?? id();

  // Rebuild only this restaurant's own rows — nobody else's are touched.
  for (const name of ["menus", "categories", "menuitems", "tables", "seats", "staffs", "orders", "bills", "guestsessions"]) {
    await db.collection(name).deleteMany({ restaurantId });
  }
  await db.collection("counters").deleteMany({ _id: { $in: [`${restaurantId}:${businessDate()}`, `${restaurantId}:bill`] } });

  const now = new Date();
  await restaurants.updateOne(
    { _id: restaurantId },
    {
      $set: {
        name: NAME,
        slug: SLUG,
        status: "ACTIVE",
        billingCycle: "MONTHLY",
        graceDays: 7,
        address: "Demo Street, Rajkot",
        phone: "+91 90000 00000",
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now, previousSlugs: [] },
      // A demo must never expire on a sales call.
      $unset: { paidUntil: "", planId: "", invite: "" },
    },
    { upsert: true }
  );

  // Menus → categories → dishes
  const categoriesByMenu = new Map();
  const dishes = [];
  for (const [menuIndex, menu] of MENUS.entries()) {
    const menuId = id();
    await db.collection("menus").insertOne({
      _id: menuId,
      restaurantId,
      name: menu.name,
      nameGu: menu.nameGu,
      sortOrder: menuIndex,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    const categoryIds = [];
    for (const [categoryIndex, category] of menu.categories.entries()) {
      const categoryId = id();
      categoryIds.push(categoryId);
      await db.collection("categories").insertOne({
        _id: categoryId,
        restaurantId,
        menuId,
        name: category.name,
        nameGu: category.nameGu,
        sortOrder: categoryIndex,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      for (const item of category.items) {
        const dish = {
          _id: id(),
          restaurantId,
          categoryId,
          name: item.name,
          nameGu: item.nameGu,
          ...(item.description ? { description: item.description } : {}),
          isBestseller: item.bestseller === true,
          price: item.price,
          isVeg: true,
          isActive: true,
          isAvailable: true,
          createdAt: now,
          updatedAt: now,
        };
        await db.collection("menuitems").insertOne(dish);
        dishes.push({ ...dish, menu: menu.name, category: category.name });
      }
    }
    categoriesByMenu.set(menu.name, categoryIds);
  }

  // Tables and their QRs
  const seats = [];
  for (const [index, table] of TABLES.entries()) {
    const tableId = id();
    await db.collection("tables").insertOne({
      _id: tableId,
      restaurantId,
      name: table.name,
      ...(table.area ? { area: table.area } : {}),
      sortOrder: index,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    for (const label of ["A", "B"].slice(0, table.seats)) {
      const seat = { _id: id(), restaurantId, tableId, label, token: token(), isActive: true, currentSessionId: null, createdAt: now, updatedAt: now };
      await db.collection("seats").insertOne(seat);
      seats.push({ ...seat, code: /\d$/.test(table.name) ? `${table.name}${label}` : `${table.name} ${label}` });
    }
  }

  // Staff, each kitchen seeing only its own menu's categories
  for (const person of STAFF) {
    await db.collection("staffs").insertOne({
      _id: id(),
      restaurantId,
      name: person.name,
      role: person.role,
      ...(await hashPin(person.pin)),
      isActive: true,
      sessionVersion: 1,
      categoryIds: person.menu ? categoriesByMenu.get(person.menu) : [],
      failedPinAttempts: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  // A day that looks like a real service: some cooking, some served, one settled.
  const dish = (name) => dishes.find((d) => d.name === name);
  const line = (name, quantity, status = "PENDING") => {
    const found = dish(name);
    return {
      menuItemId: found._id,
      nameSnapshot: found.name,
      nameGuSnapshot: found.nameGu,
      categoryId: found.categoryId,
      categorySnapshot: found.category,
      quantity,
      unitPrice: found.price,
      lineTotal: found.price * quantity,
      status,
      ...(status === "READY" ? { readyAt: new Date(now.getTime() - 20 * 60000) } : {}),
    };
  };

  const date = businessDate(now);
  const minutesAgo = (minutes) => new Date(now.getTime() - minutes * 60000);
  let tokenNumber = 0;
  const orders = [];

  const place = async ({ seat, items, note, status = "PENDING", minutes, source = "QR", email, sessionId }) => {
    tokenNumber += 1;
    const order = {
      _id: id(),
      restaurantId,
      tokenNumber,
      businessDate: date,
      source,
      ...(seat ? { seatId: seat._id, seatCode: seat.code, guestSessionId: sessionId, guestEmail: email } : {}),
      ...(note ? { note } : {}),
      items,
      totalAmount: items.reduce((sum, item) => sum + item.lineTotal, 0),
      status,
      createdAt: minutesAgo(minutes),
      updatedAt: minutesAgo(minutes),
      ...(status !== "PENDING" ? { readyAt: minutesAgo(minutes - 8) } : {}),
    };
    await db.collection("orders").insertOne(order);
    orders.push(order);
    return order;
  };

  const sitting = async (seat, email, minutes) => {
    const sessionId = id();
    await db.collection("guestsessions").insertOne({
      _id: sessionId,
      restaurantId,
      seatId: seat._id,
      seatCode: seat.code,
      email,
      deviceId: randomBytes(12).toString("base64url"),
      openedBy: "GUEST",
      status: "OPEN",
      createdAt: minutesAgo(minutes),
      updatedAt: minutesAgo(minutes),
    });
    await db.collection("seats").updateOne({ _id: seat._id }, { $set: { currentSessionId: sessionId } });
    return sessionId;
  };

  // Table 2A: just ordered — this is the ticket the kitchen screens show.
  const s2a = await sitting(seats[2], "guest1@example.com", 4);
  await place({
    seat: seats[2],
    sessionId: s2a,
    email: "guest1@example.com",
    minutes: 4,
    note: "Less spicy, no onion",
    items: [line("Gujarati Thali", 2), line("Paneer Butter Masala", 1), line("Butter Naan", 3)],
  });

  // Table 4B: eating, food already out.
  const s4b = await sitting(seats[7], "guest2@example.com", 38);
  await place({
    seat: seats[7],
    sessionId: s4b,
    email: "guest2@example.com",
    minutes: 38,
    status: "READY",
    items: [line("Sev Tameta", 1, "READY"), line("Rotli", 4, "READY"), line("Shrikhand", 2, "READY")],
  });

  // Table 1A: a second ticket for the Punjabi kitchen.
  const s1a = await sitting(seats[0], "guest3@example.com", 11);
  await place({
    seat: seats[0],
    sessionId: s1a,
    email: "guest3@example.com",
    minutes: 11,
    items: [line("Palak Paneer", 1), line("Garlic Naan", 2), line("Jeera Rice", 1)],
  });

  // Earlier today: settled tables and parcels, so the report has real numbers.
  let billNo = 0;
  const settle = async ({ seatIndex, items, minutes, paymentMode, discount = 0 }) => {
    const seat = seats[seatIndex];
    const sessionId = id();
    await db.collection("guestsessions").insertOne({
      _id: sessionId,
      restaurantId,
      seatId: seat._id,
      seatCode: seat.code,
      email: `guest${minutes}@example.com`,
      deviceId: randomBytes(12).toString("base64url"),
      openedBy: "GUEST",
      status: "CLOSED",
      closedAt: minutesAgo(minutes - 40),
      closedReason: "SETTLED",
      createdAt: minutesAgo(minutes),
      updatedAt: minutesAgo(minutes - 40),
    });
    const order = await place({ seat, sessionId, email: `guest${minutes}@example.com`, minutes, status: "COMPLETED", items });
    const itemsTotal = order.totalAmount;
    billNo += 1;
    await db.collection("bills").insertOne({
      _id: id(),
      restaurantId,
      billNo,
      businessDate: date,
      seatId: seat._id,
      seatCode: seat.code,
      guestSessionId: sessionId,
      email: `guest${minutes}@example.com`,
      orderIds: [order._id],
      lines: items.map((item) => ({ name: item.nameSnapshot, nameGu: item.nameGuSnapshot, quantity: item.quantity, amount: item.lineTotal })),
      itemsTotal,
      discount,
      total: itemsTotal - discount,
      paymentMode,
      emailStatus: "SENT",
      settledAt: minutesAgo(minutes - 40),
      createdAt: minutesAgo(minutes - 40),
      updatedAt: minutesAgo(minutes - 40),
    });
  };

  await settle({ seatIndex: 1, minutes: 180, paymentMode: "UPI", items: [line("Gujarati Thali", 3, "READY"), line("Gulab Jamun", 2, "READY")] });
  await settle({ seatIndex: 4, minutes: 150, paymentMode: "CASH", discount: 40, items: [line("Veg Biryani", 2, "READY"), line("Kadai Paneer", 1, "READY")] });
  await settle({ seatIndex: 6, minutes: 95, paymentMode: "CARD", items: [line("Mini Thali", 2, "READY"), line("Bajra Rotlo", 2, "READY"), line("Undhiyu", 1, "READY")] });
  await settle({ seatIndex: 3, minutes: 60, paymentMode: "UPI", items: [line("Paneer Butter Masala", 2, "READY"), line("Butter Naan", 4, "READY")] });

  // Parcels are paid when ordered, so they need no bill.
  await place({ source: "COUNTER", minutes: 120, status: "COMPLETED", items: [line("Sev Tameta", 2, "READY"), line("Rotli", 6, "READY")] });
  await place({ source: "COUNTER", minutes: 75, status: "COMPLETED", items: [line("Veg Biryani", 1, "READY")] });
  for (const order of orders.filter((o) => o.source === "COUNTER")) {
    await db.collection("orders").updateOne({ _id: order._id }, { $set: { paymentMode: "CASH", completedAt: order.readyAt } });
  }

  await db.collection("counters").updateOne({ _id: `${restaurantId}:${date}` }, { $set: { seq: tokenNumber } }, { upsert: true });
  await db.collection("counters").updateOne({ _id: `${restaurantId}:bill` }, { $set: { seq: billNo } }, { upsert: true });

  const fingerprint = createHash("sha1").update(String(restaurantId)).digest("hex").slice(0, 6);
  console.info(`done — /r/${SLUG} (${orders.length} orders, ${billNo} bills, ${dishes.length} dishes) · ${fingerprint}`);
  console.info(`logins: ${STAFF.map((s) => `${s.name}/${s.pin}`).join("  ")}`);
  console.info(`a guest QR: /t/${seats[2].token}`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
