import { Bill } from "@/models/Bill";
import { Counter } from "@/models/Counter";
import { isDuplicateKeyError } from "@/lib/api";
import { counterId } from "@/lib/orders/build";

/** Bill numbers run on across days ("0142"), unlike token numbers which restart daily. */
async function nextBillNumber(restaurantId: string): Promise<number> {
  const counter = await Counter.findOneAndUpdate({ _id: counterId(restaurantId, "bill") }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return counter.seq;
}

/** Which unique index a duplicate-key error hit (`billNo`, `guestSessionId`, …), if it was one. */
function duplicateKeyField(error: unknown): string | null {
  if (!isDuplicateKeyError(error)) return null;
  const pattern = (error as { keyPattern?: Record<string, unknown> }).keyPattern ?? {};
  return Object.keys(pattern).find((key) => key !== "restaurantId") ?? null;
}

/**
 * Writes the sitting's bill under the next free number. A bill counter that
 * fell behind the bills already there (a restored backup, an imported
 * restaurant) would otherwise fail every settle on the same taken number —
 * so on a clash it catches up with the highest bill number and tries again.
 * Returns null if this sitting already has a bill (someone else settled it).
 */
export async function createBill(restaurantId: string, fields: Record<string, unknown>) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await Bill.create({ ...fields, billNo: await nextBillNumber(restaurantId) });
    } catch (error) {
      const field = duplicateKeyField(error);
      if (field === "guestSessionId") return null;
      if (field !== "billNo" || attempt >= 2) throw error;
      const [last] = await Bill.find({ restaurantId }).sort({ billNo: -1 }).limit(1).select("billNo").lean<{ billNo: number }[]>();
      await Counter.updateOne({ _id: counterId(restaurantId, "bill") }, { $max: { seq: last?.billNo ?? 0 } }, { upsert: true });
    }
  }
}
