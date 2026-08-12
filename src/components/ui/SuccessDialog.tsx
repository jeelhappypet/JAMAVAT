import type { ReactNode } from "react";

interface SuccessDialogProps {
  open: boolean;
  children: ReactNode;
}

export function SuccessDialog({ open, children }: SuccessDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-3xl bg-surface p-8 text-center shadow-lg">
        {children}
      </div>
    </div>
  );
}
