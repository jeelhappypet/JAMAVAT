import Image from "next/image";
import { cn } from "@/components/ui/cn";

/**
 * A screenshot of the seeded Jamavat Demo restaurant in a device shell. The
 * images are the real aspect ratios (420×860 and 1180×760, see
 * scripts/capture-hero.mjs), so the frame uses `aspect-ratio` and never a
 * fixed pixel height: a screenshot letterboxed or cropped by its container
 * is the clearest sign a product page is showing a mock-up.
 */
export function DeviceFrame({
  src,
  alt,
  shape,
  priority = false,
  sizes,
  /** "auto" caps a phone at a readable width; "fill" lets the parent size it (the hero collage). */
  sizing = "auto",
  className,
}: {
  src: string;
  alt: string;
  shape: "phone" | "screen";
  priority?: boolean;
  sizes: string;
  sizing?: "auto" | "fill";
  className?: string;
}) {
  const phone = shape === "phone";
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-surface",
        phone
          ? "aspect-[420/860] w-full rounded-[38px] border-[7px] border-ink shadow-[0_30px_60px_-30px_rgba(42,22,17,0.65)]"
          : "aspect-[1180/760] w-full rounded-[20px] border-[7px] border-ink shadow-[0_34px_70px_-34px_rgba(42,22,17,0.6)]",
        phone && sizing === "auto" && "max-w-[268px]",
        className
      )}
    >
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover object-top" />
    </div>
  );
}
