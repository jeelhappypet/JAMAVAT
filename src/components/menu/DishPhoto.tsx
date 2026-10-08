import Image from "next/image";
import { cn } from "@/components/ui/cn";
import { DISH_PHOTO_SIZE } from "@/lib/utils/dishPhoto";

interface DishPhotoProps {
  src: string;
  alt: string;
  /** Box width in px; height follows the 6:5 photo shape. */
  width?: number;
  className?: string;
}

/**
 * A dish photo in the guest menu's 6:5 box. Photos are already resized to
 * 480×400 before upload, so Next's image optimizer is skipped (it would
 * only spend the plan's transformation quota on a file that's already small).
 */
export function DishPhoto({ src, alt, width = 96, className }: DishPhotoProps) {
  const height = Math.round((width * DISH_PHOTO_SIZE.height) / DISH_PHOTO_SIZE.width);
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      unoptimized
      loading="lazy"
      decoding="async"
      className={cn("shrink-0 rounded-xl bg-orange-50 object-cover", className)}
      style={{ width, height }}
    />
  );
}
