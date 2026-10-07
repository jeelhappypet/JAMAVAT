"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="flex h-[46px] items-center rounded-xl bg-brand px-[18px] text-[15px] font-extrabold text-white active:bg-brand-dark">
      {label}
    </button>
  );
}
