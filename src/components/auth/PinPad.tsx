"use client";

import { useEffect, useRef } from "react";
import { PIN_LENGTH } from "@/lib/auth/constants";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface PinPadProps {
  value: string;
  onChange: (value: string) => void;
  /** Called once the last digit is entered (or the enter key is pressed with a full PIN). */
  onComplete: (pin: string) => void;
  disabled?: boolean;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function PinPad({ value, onChange, onComplete, disabled }: PinPadProps) {
  const { t } = useI18n();
  const stateRef = useRef({ value, onChange, onComplete, disabled });
  useEffect(() => {
    stateRef.current = { value, onChange, onComplete, disabled };
  });

  function press(digit: string) {
    const { value: current, disabled: off } = stateRef.current;
    if (off || current.length >= PIN_LENGTH) return;
    const next = current + digit;
    stateRef.current.onChange(next);
    if (next.length === PIN_LENGTH) stateRef.current.onComplete(next);
  }

  function backspace() {
    const { value: current, disabled: off } = stateRef.current;
    if (off) return;
    stateRef.current.onChange(current.slice(0, -1));
  }

  function submit() {
    const { value: current, disabled: off } = stateRef.current;
    if (!off && current.length === PIN_LENGTH) stateRef.current.onComplete(current);
  }

  // Counters often have a keyboard — let them type the PIN too.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Enter") submit();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const keyClass =
    "flex h-[60px] items-center justify-center rounded-2xl border border-border bg-background text-[22px] font-bold active:bg-surface-muted disabled:opacity-50";

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="flex gap-4" role="status" aria-label={t("login.digitsEntered", { n: value.length })}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span
            key={i}
            className={`h-[18px] w-[18px] rounded-full ${i < value.length ? "bg-brand" : "border-2 border-stone-400"}`}
          />
        ))}
      </div>

      <div className="grid w-full max-w-[300px] grid-cols-3 gap-2.5">
        {KEYS.map((key) => (
          <button key={key} type="button" className={keyClass} disabled={disabled} onClick={() => press(key)}>
            {key}
          </button>
        ))}
        <button
          type="button"
          aria-label={t("login.deleteDigit")}
          className="flex h-[60px] items-center justify-center rounded-2xl text-text-muted active:bg-surface-muted disabled:opacity-40"
          disabled={disabled || value.length === 0}
          onClick={backspace}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 5H9l-6 7 6 7h12V5Z" />
            <path d="m16 10-4 4M12 10l4 4" />
          </svg>
        </button>
        <button type="button" className={keyClass} disabled={disabled} onClick={() => press("0")}>
          0
        </button>
        <button
          type="button"
          aria-label={t("login.submit")}
          className="flex h-[60px] items-center justify-center rounded-2xl bg-brand text-white active:bg-brand-dark disabled:opacity-50"
          disabled={disabled || value.length < PIN_LENGTH}
          onClick={submit}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}
