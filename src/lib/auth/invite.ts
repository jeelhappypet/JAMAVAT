import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { connectToDatabase } from "@/lib/db/mongodb";
import { Restaurant, type RestaurantDocument } from "@/models/Restaurant";
import { Staff } from "@/models/Staff";
import { appPath } from "@/lib/auth/access";

/** How long an invite link works before HQ has to send a new one. */
export const INVITE_DAYS = 14;

function hash(token: string): string {
  return createHmac("sha256", `invite:${process.env.ADMIN_SESSION_SECRET}`).update(token).digest("hex");
}

/**
 * One-time link that lets a restaurant's owner create their first admin
 * login. Only the hash is stored, it expires, and it stops working the
 * moment that restaurant has any staff — so a forwarded email can't add a
 * second admin later.
 */
export async function createInvite(restaurantId: string): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  await Restaurant.updateOne(
    { _id: restaurantId },
    { $set: { invite: { tokenHash: hash(token), expiresAt: new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000) } } }
  );
  return token;
}

export function inviteUrl(baseUrl: string, slug: string, token: string): string {
  return `${baseUrl}${appPath(slug, "/welcome")}?invite=${token}`;
}

export type InviteCheck =
  | { ok: true; restaurantId: string }
  | { ok: false; reason: "USED" | "INVALID" };

/** USED = that restaurant already has a login (so they should sign in instead). */
export async function checkInvite(restaurantId: string, token: string): Promise<InviteCheck> {
  await connectToDatabase();
  if (await Staff.exists({ restaurantId })) return { ok: false, reason: "USED" };

  const restaurant = await Restaurant.findById(restaurantId).select({ invite: 1 }).lean<RestaurantDocument>();
  const stored = restaurant?.invite?.tokenHash;
  const expires = restaurant?.invite?.expiresAt;
  if (!stored || !expires || expires.getTime() < Date.now()) return { ok: false, reason: "INVALID" };

  const a = Buffer.from(stored);
  const b = Buffer.from(hash(token));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "INVALID" };
  return { ok: true, restaurantId };
}

/** Called once the first admin exists — the link can't be used again. */
export async function clearInvite(restaurantId: string): Promise<void> {
  await Restaurant.updateOne({ _id: restaurantId }, { $unset: { invite: "" } });
}
