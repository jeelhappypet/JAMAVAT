"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChangePinDialog } from "@/components/auth/ChangePinDialog";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { Lang, MessageKey } from "@/lib/i18n/messages";
import type { StaffRole } from "@/types";

interface AccountMenuProps {
  name: string;
  role: StaffRole;
  /** Text on the chip — the artboards show "Meena · Counter" on the counter and just "Owner" on admin pages. */
  label?: string;
  /** pill: light chip (counter/admin headers) · plain: just the name, for the dark kitchen header. */
  variant?: "pill" | "plain";
  /** Dark initial circle (admin artboards) or light grey (counter artboard). */
  avatar?: "dark" | "light";
  links?: { href: string; label: MessageKey }[];
  sound?: { on: boolean; toggle: () => void };
}

/** Ends this device's session: clears offline caches too, so the next person on a shared tablet starts clean. */
export async function logoutThisDevice() {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
  if ("caches" in window) {
    await caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => null);
  }
  // Full reload on purpose: drops every in-memory screen, socket and poller from the old session.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/login");
}

const LANGS: { lang: Lang; label: string }[] = [
  { lang: "en", label: "EN" },
  { lang: "gu", label: "ગુ" },
];

const itemClass = "flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[15px] font-semibold hover:bg-surface-muted";

export function AccountMenu({ name, role, label, variant = "pill", avatar = "dark", links = [], sound }: AccountMenuProps) {
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const [changingPin, setChangingPin] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function logout() {
    setLoggingOut(true);
    await logoutThisDevice();
  }

  const chipText = label ?? `${name} · ${t(`role.${role}`)}`;

  return (
    <div ref={rootRef} className="relative">
      {variant === "plain" ? (
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t("account.menu", { name })}
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 items-center gap-1.5 rounded-[10px] px-2 text-sm font-bold text-white"
        >
          {name}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      ) : (
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={t("account.menu", { name })}
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 text-foreground"
        >
          <span
            className={`flex shrink-0 items-center justify-center rounded-full font-extrabold ${
              avatar === "dark" ? "h-8 w-8 bg-stone-900 text-[13px] text-white" : "h-[34px] w-[34px] bg-stone-200 text-sm text-foreground"
            }`}
          >
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="max-w-[180px] truncate text-[13px] font-bold">{chipText}</span>
        </button>
      )}

      {open ? (
        <div role="menu" className="absolute right-0 top-[calc(100%+6px)] z-40 w-60 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 text-foreground shadow-lg">
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="text-[13px] font-bold text-text-muted">{t("lang.switch")}</span>
            <div role="group" aria-label={t("lang.switch")} className="flex rounded-[10px] bg-stone-200 p-[3px]">
              {LANGS.map((option) => (
                <button
                  key={option.lang}
                  type="button"
                  aria-pressed={option.lang === lang}
                  onClick={() => option.lang !== lang && setLang(option.lang)}
                  className={`h-8 min-w-10 rounded-[8px] px-2 text-sm font-bold ${option.lang === lang ? "bg-surface text-brand-dark shadow-sm" : "text-text-muted"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {sound ? (
            <button type="button" role="menuitemcheckbox" aria-checked={sound.on} onClick={sound.toggle} className={itemClass}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M11 5 6 9H3v6h3l5 4V5Z" />
                {sound.on ? <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /> : <path d="m22 9-6 6M16 9l6 6" />}
              </svg>
              {sound.on ? t("account.soundOn") : t("account.soundOff")}
            </button>
          ) : null}
          {links.map((link) => (
            <Link key={link.href} href={link.href} role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M7 17 17 7M9 7h8v8" />
              </svg>
              {t(link.label)}
            </Link>
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setChangingPin(true);
            }}
            className={itemClass}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="4" y="10" width="16" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            {t("account.changePin")}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            disabled={loggingOut}
            className={`${itemClass} text-danger hover:bg-danger-light disabled:opacity-60`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5M21 12H9" />
            </svg>
            {loggingOut ? t("account.loggingOut") : t("account.logout")}
          </button>
        </div>
      ) : null}

      <ChangePinDialog open={changingPin} onClose={() => setChangingPin(false)} />
    </div>
  );
}
