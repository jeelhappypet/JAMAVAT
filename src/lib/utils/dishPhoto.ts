/**
 * Turns any phone/camera photo into the one size the menu shows: centre-cropped
 * to the guest menu's 6:5 photo box and scaled to 480×400 (sharp on a 3×
 * screen at 96×80). WebP where the browser can encode it, JPEG otherwise.
 * A dish photo ends up ~30–60 KB, which keeps Blob storage and transfer tiny.
 */
export const DISH_PHOTO_SIZE = { width: 480, height: 400 } as const;

export async function resizeDishPhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = DISH_PHOTO_SIZE;
  const scale = Math.max(width / bitmap.width, height / bitmap.height);
  const cropW = width / scale;
  const cropH = height / scale;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, (bitmap.width - cropW) / 2, (bitmap.height - cropH) / 2, cropW, cropH, 0, 0, width, height);
  bitmap.close();

  const webp = await toBlob(canvas, "image/webp", 0.8);
  // Older Safari ignores the type and hands back a PNG.
  if (webp?.type === "image/webp") return webp;
  const jpeg = await toBlob(canvas, "image/jpeg", 0.82);
  if (!jpeg) throw new Error("encode");
  return jpeg;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}
