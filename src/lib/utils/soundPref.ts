"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { unlockSound } from "@/lib/utils/beep";

const CHANGE_EVENT = "jamavat:sound-pref";

export const COUNTER_SOUND = "jamavat:counter-sound";
export const KITCHEN_SOUND = "jamavat:kitchen-sound";

function read(key: string): boolean {
  try {
    return localStorage.getItem(key) !== "off";
  } catch {
    return true;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * New-order beep on/off, shared between the header's sound button and the
 * screen that beeps. On by default; remembered per device.
 */
export function useSoundPref(key: string): [boolean, () => void] {
  const on = useSyncExternalStore(subscribe, () => read(key), () => true);
  const toggle = useCallback(() => {
    const next = !read(key);
    if (next) void unlockSound();
    try {
      localStorage.setItem(key, next ? "on" : "off");
    } catch {
      // not remembered — fine
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, [key]);
  return [on, toggle];
}

/**
 * Browsers keep audio locked until the user taps the page. Staff tap the
 * screen within seconds of opening it, so unlock on that first tap instead
 * of making them find a "sound on" button.
 */
export function useUnlockSoundOnFirstTap() {
  useEffect(() => {
    const unlock = () => void unlockSound();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);
}
