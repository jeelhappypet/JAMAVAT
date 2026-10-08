"use client";

import { useRef, useState } from "react";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { PinPad } from "@/components/auth/PinPad";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localName } from "@/lib/i18n/messages";
import type { StaffLoginOption } from "@/types";

interface LoginScreenProps {
  restaurantName: string | null;
  staff: StaffLoginOption[];
  next?: string;
  expired: boolean;
}

/** Only same-site paths — never let ?next= send someone to another site. */
function safeNext(next: string | undefined): string | undefined {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : undefined;
}

const cardClass = "flex min-w-0 flex-[1_1_340px] flex-col rounded-3xl border border-border bg-surface p-7";

export function LoginScreen({ restaurantName, staff, next, expired }: LoginScreenProps) {
  const { t, lang } = useI18n();
  const roleLabel = (option: StaffLoginOption) =>
    option.station ? t("login.station", { name: localName(lang, option.station.name, option.station.nameGu) }) : t(`role.${option.role}`);
  const [selectedId, setSelectedId] = useState<string | null>(staff.length === 1 ? staff[0].id : null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExpired, setShowExpired] = useState(expired);
  const pinCardRef = useRef<HTMLElement>(null);

  const selected = staff.find((s) => s.id === selectedId) ?? null;

  function pick(id: string) {
    setSelectedId(id);
    setPin("");
    setError(null);
    setShowExpired(false);
    // On a phone the PIN pad sits below the name list — bring it into view.
    requestAnimationFrame(() => pinCardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  }

  async function submit(fullPin: string) {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    setShowExpired(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId: selectedId, pin: fullPin }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("err.loginFailed"));
      // Full navigation so the proxy and every page see the new cookie.
      window.location.assign(safeNext(next) ?? data.redirectTo ?? "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("err.loginFailed"));
      setPin("");
      setBusy(false);
    }
  }

  const message = error ?? (showExpired ? t("login.expired") : null);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface-muted">
      <AuthHeader restaurantName={restaurantName} />

      <main className="flex flex-1 items-center justify-center px-[clamp(16px,3vw,32px)] pb-10 pt-4">
        <div className="flex w-full max-w-[880px] flex-wrap items-stretch gap-6">
          <section className={`${cardClass} gap-[18px]`}>
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[26px] font-extrabold tracking-tight">{t("login.title")}</h1>
              <p className="text-[15px] text-text-muted">{t("login.subtitle")}</p>
            </div>

            {staff.length === 0 ? (
              <p className="text-[15px] text-text-muted">{t("login.noStaff")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {staff.map((s) => {
                  const isSelected = s.id === selectedId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => pick(s.id)}
                      className={`flex min-h-16 items-center gap-2.5 rounded-2xl p-3 text-left ${
                        isSelected ? "border-2 border-brand bg-orange-50" : "border border-border bg-surface"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-extrabold ${
                          isSelected ? "bg-brand text-white" : s.role === "ADMIN" ? "bg-stone-900 text-white" : "bg-stone-200"
                        }`}
                      >
                        {s.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-[15px] font-bold">{s.name}</span>
                        <span className="text-xs text-text-muted">{roleLabel(s)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-auto flex items-start gap-2.5 rounded-[14px] bg-surface-muted px-3.5 py-3 text-[13px] leading-relaxed text-stone-700">
              <svg className="mt-px shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              <span>{t("login.roleNote")}</span>
            </div>
          </section>

          <section ref={pinCardRef} className={`${cardClass} items-center gap-5`}>
            {selected ? (
              <>
                <div className="flex flex-col items-center gap-1 text-center">
                  <span className="text-sm text-text-muted">{t("login.as")}</span>
                  <span className="text-xl font-extrabold">
                    {selected.name} · {roleLabel(selected)}
                  </span>
                </div>
                <PinPad value={pin} onChange={setPin} onComplete={submit} disabled={busy} />
              </>
            ) : (
              <p className="m-auto max-w-[260px] text-center text-[15px] text-text-muted">{t("login.pickFirst")}</p>
            )}

            {message ? (
              <p role="alert" className="text-center text-[15px] font-semibold text-danger">
                {message}
              </p>
            ) : null}

            {selected ? <p className="text-center text-[13px] text-text-muted">{t("login.stayNote")}</p> : null}
          </section>
        </div>
      </main>
    </div>
  );
}
