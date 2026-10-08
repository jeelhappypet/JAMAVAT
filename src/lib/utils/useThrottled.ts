"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Runs `fn` at most once per `ms`: the first call goes through, calls during
 * the wait collapse into one trailing run. For screens that redo heavy work
 * (reports) on every realtime event — a busy lunch hour sends many.
 */
export function useThrottled(fn: () => void, ms: number): () => void {
  const fnRef = useRef(fn);
  const last = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  });
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return useCallback(() => {
    const wait = last.current + ms - Date.now();
    if (wait <= 0) {
      last.current = Date.now();
      fnRef.current();
    } else if (!timer.current) {
      timer.current = setTimeout(() => {
        timer.current = null;
        last.current = Date.now();
        fnRef.current();
      }, wait);
    }
  }, [ms]);
}
