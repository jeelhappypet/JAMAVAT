/** The Jamavat software mark from the design canvas — orange tile with a cloche. */
export function BrandMark({ size = 40, withName = false }: { size?: number; withName?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="flex shrink-0 items-center justify-center rounded-xl bg-brand text-white"
        style={{ width: size, height: size }}
        aria-hidden={withName}
      >
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 18h18" />
          <path d="M5 18a7 7 0 0 1 14 0" />
          <path d="M12 8V6" />
          <path d="M10 6h4" />
        </svg>
      </span>
      {withName ? <span className="text-lg font-extrabold">Jamavat</span> : null}
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
