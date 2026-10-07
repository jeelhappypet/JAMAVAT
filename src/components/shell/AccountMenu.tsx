"use client";

import { useEffect, useRef, useState } from "react";
import { ChangePinDialog } from "@/components/auth/ChangePinDialog";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { StaffRole } from "@/types";

export function AccountMenu({ name, role }: { name: string; role: StaffRole }) {
  const { t } = useI18n();
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
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    // The service worker keeps visited pages for offline fallback — don't leave this person's behind.
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

  return (
    // text-foreground: the chip and menu stay readable inside the dark kitchen header too.
    <div ref={rootRef} className="relative text-foreground">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("account.menu", { name })}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-[13px] font-extrabold text-white">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="max-w-[160px] truncate text-[13px] font-bold">
          {name} · {t(`role.${role}`)}
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div role="menu" className="absolute right-0 top-[calc(100%+6px)] z-40 w-52 overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-lg">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setChangingPin(true);
            }}
            className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[15px] font-semibold hover:bg-surface-muted"
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
            className="flex h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-[15px] font-semibold text-danger hover:bg-danger-light disabled:opacity-60"
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
