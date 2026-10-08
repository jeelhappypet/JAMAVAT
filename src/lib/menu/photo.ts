import { del, put } from "@vercel/blob";

/**
 * Dish photos live in a public Vercel Blob store. The browser already
 * resized the photo (lib/utils/dishPhoto.ts), so the server only checks
 * and stores it — no image processing in the function.
 */

export const PHOTO_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;
/** A resized photo is ~30–60 KB; this only stops someone posting a raw camera file. */
export const PHOTO_MAX_BYTES = 1024 * 1024;

/** Set by Vercel when a Blob store is connected to the project. */
export function photoStorageReady(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

const EXTENSIONS: Record<(typeof PHOTO_TYPES)[number], string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** Stores a new photo under a fresh URL, so browsers and the CDN can cache it for a year. */
export async function storeDishPhoto(itemId: string, file: Blob, type: (typeof PHOTO_TYPES)[number]): Promise<string> {
  const blob = await put(`dishes/${itemId}.${EXTENSIONS[type]}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: type,
    cacheControlMaxAge: 365 * 24 * 60 * 60,
  });
  return blob.url;
}

/** Best effort: a photo left behind only costs a few KB, so a failed delete never fails the request. */
export async function deleteDishPhoto(url: string | undefined | null): Promise<void> {
  if (!url || !photoStorageReady()) return;
  try {
    await del(url);
  } catch (error) {
    console.error("Could not delete dish photo", error);
  }
}
