import Link from "next/link";

export function HomeButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`touch-target inline-flex items-center gap-2 rounded-2xl border border-border bg-surface px-4 py-2 text-base font-semibold text-foreground active:bg-surface-muted ${className}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      હોમ
    </Link>
  );
}
