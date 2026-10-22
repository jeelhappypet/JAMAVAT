import Image from "next/image";
import { cn } from "@/components/ui/cn";

/**
 * Jamavat's actual logo — the cloche and steam from `public/brand/logo.png`,
 * exported on its own at `public/icons/icon-192.png`. This used to be a
 * cloche drawn in four SVG paths, which was not the logo and looked like a
 * placeholder next to it.
 *
 * The artwork is brown on transparent, so it needs a light tile to sit on:
 * the cream tile keeps it readable on the dark kitchen and HQ headers too,
 * where the bare mark would disappear.
 */
export function BrandMark({
  size = 40,
  withName = false,
  /** Hides the wordmark below `sm`, keeping the tile — the site header needs the room for its CTA. */
  compactName = false,
  className,
}: {
  size?: number;
  withName?: boolean;
  compactName?: boolean;
  className?: string;
}) {
  const inner = Math.round(size * 0.86);
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        className="flex shrink-0 items-center justify-center overflow-hidden bg-brand-light"
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }}
      >
        <Image
          src="/icons/icon-192.png"
          alt={withName ? "" : "Jamavat"}
          width={inner}
          height={inner}
          sizes={`${inner}px`}
          // Three colours and hard edges: Next's optimizer costs a request and
          // a function invocation to make this 17 KB file no smaller.
          unoptimized
          priority
        />
      </span>
      {withName ? (
        <span className={cn("flex-col leading-none", compactName ? "hidden sm:flex" : "flex")}>
          <span className="text-lg font-extrabold tracking-[-0.01em]">Jamavat</span>
          {/* The Gujarati spelling, not uppercased or letter-spaced: the script has no
              case and tracking pulls its conjuncts apart. */}
          <span className="mt-1 text-[11px] font-semibold text-text-muted">જમાવટ</span>
        </span>
      ) : null}
    </span>
  );
}

/** Restaurant initial tile used next to the restaurant's name. */
export function RestaurantInitial({ name, size = 30, solid = false }: { name: string; size?: number; solid?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center font-extrabold ${
        solid ? "bg-brand text-white" : "bg-brand-light text-brand-dark"
      }`}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3), fontSize: Math.round(size * 0.46) }}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
