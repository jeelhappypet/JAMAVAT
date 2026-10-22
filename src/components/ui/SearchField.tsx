"use client";

import { useId } from "react";
import { cn } from "./cn";

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** Spoken name of the box, and its placeholder unless `placeholder` says otherwise. */
  label: string;
  placeholder?: string;
  clearLabel: string;
  /** How many things match right now, read out as the person types. */
  resultCount?: number;
  resultLabel?: string;
  size?: "sm" | "md";
  autoFocus?: boolean;
  /** Layout only: width, flex, margin. */
  className?: string;
}

/**
 * The search box on the counter's dish grid and the menu screens.
 *
 * `type="search"` rather than `type="text"`: a phone keyboard then offers a
 * "search" key instead of a newline, and the browser gives a native clear
 * control. The clear button here is on top of that, because the native one
 * is invisible on iOS and too small for a thumb on a counter tablet.
 *
 * The match count is announced politely so someone typing with a screen
 * reader hears the list shrink without losing their place in the field.
 */
export function SearchField({
  value,
  onChange,
  label,
  placeholder,
  clearLabel,
  resultCount,
  resultLabel,
  size = "md",
  autoFocus = false,
  className,
}: SearchFieldProps) {
  const statusId = useId();
  const tall = size === "md";

  return (
    <div className={cn("relative flex min-w-0 items-center", className)}>
      <span className={cn("pointer-events-none absolute text-text-muted", tall ? "left-3.5" : "left-3")} aria-hidden>
        <svg width={tall ? 19 : 17} height={tall ? 19 : 17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" />
        </svg>
      </span>

      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        placeholder={placeholder ?? label}
        autoFocus={autoFocus}
        aria-describedby={resultCount === undefined ? undefined : statusId}
        className={cn(
          "w-full border border-border bg-surface font-normal text-foreground outline-none placeholder:text-text-muted/70",
          "transition-colors focus:border-brand",
          // The browser's own clear cross would sit under ours.
          "[&::-webkit-search-cancel-button]:appearance-none",
          tall ? "h-12 rounded-xl pl-11 pr-11 text-base" : "h-10 rounded-[10px] pl-9 pr-9 text-sm"
        )}
      />

      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={clearLabel}
          className={cn(
            "absolute flex items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-muted hover:text-foreground",
            tall ? "right-2 h-8 w-8" : "right-1.5 h-7 w-7"
          )}
        >
          <svg width={tall ? 17 : 15} height={tall ? 17 : 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      ) : null}

      {resultCount === undefined ? null : (
        <span id={statusId} role="status" aria-live="polite" className="sr-only">
          {resultLabel}
        </span>
      )}
    </div>
  );
}
