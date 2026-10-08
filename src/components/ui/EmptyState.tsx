import type { ReactNode } from "react";

/** Dashed placeholder card ("No running orders"). */
export function EmptyState({ title, hint }: { title: string; hint?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-[18px] border border-dashed border-stone-300 bg-surface px-6 py-12 text-center">
      <p className="text-[15px] font-bold text-stone-700">{title}</p>
      {hint ? <p className="text-sm text-text-muted">{hint}</p> : null}
    </div>
  );
}
