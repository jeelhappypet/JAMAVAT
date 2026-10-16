"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

/**
 * The thin brand line across the top while something the user tapped is
 * being worked on: a page change (internal link) or a request the tap
 * started (saving, sending, settling). Background refreshes — polling,
 * realtime reloads, prefetches — never show it, so it always means "your
 * tap is on its way".
 */

/** A GET counts as the user's own only if it starts this soon after their tap. */
const TAP_WINDOW_MS = 800;
/** A navigation that never lands (offline, error page) stops showing after this. */
const NAV_TIMEOUT_MS = 15000;

let pending = 0;
let navigating = false;
let lastTap = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const busySnapshot = () => pending > 0 || navigating;

function isUserRequest(input: RequestInfo | URL, init?: RequestInit): boolean {
  const request = input instanceof Request ? input : null;
  const method = (init?.method ?? request?.method ?? "GET").toUpperCase();
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  // pusher-js signs its channel on connect — never something the user waits for.
  if (url.includes("/api/pusher/")) return false;
  const headers = new Headers(init?.headers ?? request?.headers);
  if (headers.has("next-router-prefetch")) return false;
  if (method !== "GET" && method !== "HEAD") return true;
  return performance.now() - lastTap < TAP_WINDOW_MS;
}

let patched = false;

/** Wraps window.fetch once so every screen gets the bar without touching its code. */
function patchFetch() {
  if (patched || typeof window === "undefined") return;
  patched = true;
  const original = window.fetch.bind(window);
  window.fetch = (input, init) => {
    if (!isUserRequest(input, init)) return original(input, init);
    pending += 1;
    emit();
    return original(input, init).finally(() => {
      pending = Math.max(0, pending - 1);
      emit();
    });
  };
}

function setNavigating(next: boolean) {
  if (navigating === next) return;
  navigating = next;
  emit();
}

/**
 * An internal link to another page. Next's <Link> always cancels the click
 * (it navigates client-side), so a cancelled click still counts.
 */
function navigationTarget(event: MouseEvent): URL | null {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
  const anchor = (event.target as Element | null)?.closest?.("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin || url.pathname.startsWith("/api/")) return null;
  // Only a new path ends with a pathname change; a query-only change is covered by its fetch.
  if (url.pathname === window.location.pathname) return null;
  return url;
}

export function TopProgress() {
  const busy = useSyncExternalStore(subscribe, busySnapshot, () => false);
  const pathname = usePathname();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    patchFetch();
    const markTap = () => {
      lastTap = performance.now();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") markTap();
    };
    const onClick = (event: MouseEvent) => {
      if (navigationTarget(event)) setNavigating(true);
    };
    window.addEventListener("pointerdown", markTap, true);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("pointerdown", markTap, true);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("click", onClick, true);
    };
  }, []);

  // The new page has rendered.
  useEffect(() => {
    setNavigating(false);
  }, [pathname]);

  useEffect(() => {
    if (!busy) return;
    const timeout = setTimeout(() => setNavigating(false), NAV_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [busy]);

  // Fade out a moment after the work ends, so a quick save still reads as a blink, not a flicker.
  useEffect(() => {
    if (busy) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the external busy flag with a trailing delay
      setShown(true);
      return;
    }
    const timeout = setTimeout(() => setShown(false), 250);
    return () => clearTimeout(timeout);
  }, [busy]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px] overflow-hidden bg-brand-light transition-opacity duration-200 print:hidden ${
        busy || shown ? (busy ? "opacity-100" : "opacity-0") : "hidden"
      }`}
    >
      <div className="top-progress-bar h-full w-full bg-brand" />
    </div>
  );
}
