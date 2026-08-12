import type { ReactNode } from "react";

export function EmptyState({ title, hint }: { title: string; hint?: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-text-muted">
      <p className="text-lg font-medium">{title}</p>
      {hint ? <p className="text-sm">{hint}</p> : null}
    </div>
  );
}
