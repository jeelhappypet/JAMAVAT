"use client";

import { useEffect, useRef, useState } from "react";
import { GuestHeader } from "@/components/guest/GuestHeader";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { GuestStateDTO } from "@/types";

interface GuestVerifyViewProps {
  restaurantName: string;
  state: GuestStateDTO;
  token: string;
  placing: boolean;
  onBack: () => void;
  onVerified: (email: string) => void;
}

const RESEND_SECONDS = 30;

/** "3 · Email OTP" artboard: email → 6-digit code → place order. Only once per phone (30 days). */
export function GuestVerifyView({ restaurantName, state, token, placing, onBack, onVerified }: GuestVerifyViewProps) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function send(target: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/guest/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email: target }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("err.otpSendFailed"));
      setSentTo(target.trim().toLowerCase());
      setDevCode(data?.devCode ?? null);
      setDigits(Array(6).fill(""));
      setResendIn(RESEND_SECONDS);
      setTimeout(() => inputs.current[0]?.focus(), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("err.otpSendFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function verify(code: string) {
    if (!sentTo) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/guest/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email: sentTo, code, remember }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("err.otpVerifyFailed"));
      onVerified(data.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("err.otpVerifyFailed"));
      setDigits(Array(6).fill(""));
      inputs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  }

  function setDigit(index: number, value: string) {
    const clean = value.replace(/\D/g, "");
    // Pasting / SMS-style autofill drops the whole code into one box.
    if (clean.length > 1) {
      const next = clean.slice(0, 6).split("");
      const filled = [...next, ...Array(6 - next.length).fill("")];
      setDigits(filled);
      inputs.current[Math.min(next.length, 5)]?.focus();
      return;
    }
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    if (clean && index < 5) inputs.current[index + 1]?.focus();
  }

  const code = digits.join("");
  // The first empty box is the one being typed into — it alone gets the orange ring, as in the artboard.
  const activeDigit = digits.findIndex((digit) => !digit);
  const working = busy || placing;

  return (
    <div className="flex min-h-full w-full max-w-[480px] flex-col bg-background">
      <GuestHeader restaurantName={restaurantName} title={t("guest.almostDone")} subtitle={t("guest.step", { code: state.seatCode })} onBack={onBack} />

      <main className="flex flex-1 flex-col gap-5 px-5 pb-6 pt-7">
        <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-brand-light text-brand">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight">{t("guest.verifyTitle")}</h1>
          <p className="text-[15px] leading-relaxed text-text-muted">{t("guest.verifyBody", { code: state.seatCode })}</p>
        </div>

        {!sentTo ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(email);
            }}
            className="flex flex-col gap-3"
          >
            <label className="flex flex-col gap-1.5 text-sm font-bold">
              {t("guest.email")}
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-[52px] rounded-xl border border-stone-300 bg-surface px-3.5 text-base font-normal"
              />
            </label>
            <button type="submit" disabled={working || !email.trim()} className="h-[52px] rounded-2xl bg-brand text-base font-extrabold text-white disabled:opacity-60">
              {busy ? t("guest.sending") : t("guest.sendCode")}
            </button>
          </form>
        ) : (
          <>
            <div className="flex items-center gap-2.5 rounded-[14px] border border-border bg-surface px-3.5 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-light text-green-700">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span className="flex min-w-0 flex-grow flex-col">
                <span className="text-xs text-text-muted">{t("guest.codeSentTo")}</span>
                <span className="truncate text-[15px] font-bold">{sentTo}</span>
              </span>
              <button type="button" onClick={() => setSentTo(null)} className="px-1 py-2.5 text-sm font-bold text-brand">
                {t("guest.change")}
              </button>
            </div>

            {devCode ? <div className="rounded-[14px] border border-dashed border-amber-500 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">{t("guest.devCode", { code: devCode })}</div> : null}

            <fieldset className="flex flex-col gap-2.5">
              <legend className="mb-2.5 text-sm font-bold">{t("guest.enterCode")}</legend>
              <div className="grid grid-cols-6 gap-2">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputs.current[index] = el;
                    }}
                    aria-label={t("guest.digit", { n: index + 1 })}
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    value={digit}
                    onChange={(e) => setDigit(index, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !digit && index > 0) inputs.current[index - 1]?.focus();
                    }}
                    className={`h-14 w-full rounded-xl bg-surface text-center text-[22px] font-extrabold ${index === activeDigit ? "border-2 border-brand" : "border-[1.5px] border-border"}`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-[13px] text-text-muted">
                <span>{t("guest.codeExpires")}</span>
                {resendIn > 0 ? (
                  <span>{t("guest.resendIn", { s: resendIn })}</span>
                ) : (
                  <button type="button" disabled={working} onClick={() => send(sentTo)} className="font-bold text-brand">
                    {t("guest.resend")}
                  </button>
                )}
              </div>
            </fieldset>

            <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-text-muted">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#c2410c]" />
              <span>{t("guest.remember")}</span>
            </label>
          </>
        )}

        {error ? (
          <div role="alert" className="rounded-[14px] bg-danger-light px-4 py-3 text-sm font-semibold text-red-900">
            {error}
          </div>
        ) : null}
      </main>

      {sentTo ? (
        <div className="sticky bottom-0 flex flex-col gap-2.5 border-t border-border bg-surface px-4 pb-4 pt-3">
          <button
            type="button"
            disabled={working || code.length !== 6}
            onClick={() => verify(code)}
            className="flex h-14 items-center justify-center rounded-2xl bg-brand text-[17px] font-extrabold text-white disabled:opacity-60"
          >
            {busy ? t("guest.verifying") : placing ? t("guest.placing") : t("guest.verifyAndPlace")}
          </button>
          <p className="text-center text-xs text-text-muted">{t("guest.privacy")}</p>
        </div>
      ) : null}
    </div>
  );
}
