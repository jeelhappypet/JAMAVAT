import { createHmac, randomBytes } from "crypto";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Restaurant, type RestaurantDocument } from "@/models/Restaurant";
import { Staff } from "@/models/Staff";
import { hashPin, verifyPin } from "@/lib/auth/pin";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 5;
export const PASSWORD_RESET_HOURS = 1;

function hashToken(token: string): string {
  return createHmac("sha256", `pwreset:${process.env.ADMIN_SESSION_SECRET}`).update(token).digest("hex");
}

export type OwnerLoginResult =
  | { ok: true; slug: string }
  | { ok: false; reason: "INVALID" | "NO_STAFF" }
  | { ok: false; reason: "LOCKED"; minutes: number };

/**
 * Finds the restaurant a username-or-email + password belongs to, for the
 * "find my restaurant" login on Jamavat's own site. This never starts a
 * staff session by itself — a match just hands off to that restaurant's own
 * `/login` PIN screen, which is the real authentication.
 */
export async function verifyOwnerLogin(identifier: string, password: string): Promise<OwnerLoginResult> {
  await connectToDatabase();
  const id = identifier.trim().toLowerCase();
  if (!id || !password) return { ok: false, reason: "INVALID" };

  const byUsername = await Restaurant.findOne({ ownerUsername: id }).lean<RestaurantDocument>();
  const candidates = byUsername ? [byUsername] : await Restaurant.find({ ownerEmail: id }).lean<RestaurantDocument[]>();

  for (const candidate of candidates) {
    if (!candidate.ownerPasswordHash || !candidate.ownerPasswordSalt) continue;

    if (candidate.ownerLoginLockedUntil && candidate.ownerLoginLockedUntil.getTime() > Date.now()) {
      return { ok: false, reason: "LOCKED", minutes: Math.ceil((candidate.ownerLoginLockedUntil.getTime() - Date.now()) / 60000) };
    }

    const correct = await verifyPin(password, candidate.ownerPasswordHash, candidate.ownerPasswordSalt);
    if (!correct) {
      const updated = await Restaurant.findOneAndUpdate(
        { _id: candidate._id },
        { $inc: { ownerLoginAttempts: 1 } },
        { returnDocument: "after" }
      ).lean<RestaurantDocument>();
      const attempts = updated?.ownerLoginAttempts ?? MAX_ATTEMPTS;
      if (attempts >= MAX_ATTEMPTS) {
        await Restaurant.updateOne({ _id: candidate._id }, { $set: { ownerLoginAttempts: 0, ownerLoginLockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000) } });
        return { ok: false, reason: "LOCKED", minutes: LOCK_MINUTES };
      }
      continue;
    }

    if (candidate.ownerLoginAttempts || candidate.ownerLoginLockedUntil) {
      await Restaurant.updateOne({ _id: candidate._id }, { $set: { ownerLoginAttempts: 0 }, $unset: { ownerLoginLockedUntil: 1 } });
    }

    // Correct password, but nobody has opened the invite link yet — send them there instead of into a dead end.
    if (!(await Staff.exists({ restaurantId: candidate._id }))) return { ok: false, reason: "NO_STAFF" };
    return { ok: true, slug: candidate.slug };
  }

  return { ok: false, reason: "INVALID" };
}

export async function setOwnerPassword(restaurantId: string, password: string): Promise<void> {
  await connectToDatabase();
  const { pinHash, pinSalt } = await hashPin(password);
  await Restaurant.updateOne(
    { _id: restaurantId },
    { $set: { ownerPasswordHash: pinHash, ownerPasswordSalt: pinSalt, ownerLoginAttempts: 0 }, $unset: { ownerLoginLockedUntil: 1, passwordReset: 1 } }
  );
}

/** "Forgot password" link — hashed and short-lived, same shape as the owner invite token. */
export async function createPasswordResetToken(restaurantId: string): Promise<string> {
  await connectToDatabase();
  const token = randomBytes(24).toString("base64url");
  await Restaurant.updateOne(
    { _id: restaurantId },
    { $set: { passwordReset: { tokenHash: hashToken(token), expiresAt: new Date(Date.now() + PASSWORD_RESET_HOURS * 60 * 60 * 1000) } } }
  );
  return token;
}

export type ResetTokenCheck = { ok: true; restaurantId: string } | { ok: false };

export async function checkPasswordResetToken(token: string): Promise<ResetTokenCheck> {
  await connectToDatabase();
  const restaurant = await Restaurant.findOne({ "passwordReset.tokenHash": hashToken(token) }).lean<RestaurantDocument>();
  const expires = restaurant?.passwordReset?.expiresAt;
  if (!restaurant || !expires || expires.getTime() < Date.now()) return { ok: false };
  return { ok: true, restaurantId: String(restaurant._id) };
}

/** Is there a restaurant with this owner email that could receive a reset link? Used so "forgot password" can say so plainly, per the owner's choice to not be enumeration-safe here. */
export async function findRestaurantForPasswordReset(email: string): Promise<RestaurantDocument | null> {
  await connectToDatabase();
  return Restaurant.findOne({ ownerEmail: email.trim().toLowerCase(), ownerPasswordHash: { $exists: true } }).lean<RestaurantDocument>();
}
