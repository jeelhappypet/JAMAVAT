/** FSSAI-style mark: green square with a dot for veg, brown square with a triangle for non-veg. */
export function VegMark({ isVeg, label }: { isVeg: boolean; label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] ${
        isVeg ? "border-green-700" : "border-amber-900"
      }`}
    >
      {isVeg ? (
        <span className="h-1.5 w-1.5 rounded-full bg-green-700" />
      ) : (
        <span className="h-0 w-0 border-x-[3.5px] border-b-[6px] border-x-transparent border-b-amber-900" />
      )}
    </span>
  );
}
