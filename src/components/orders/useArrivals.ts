"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The ids that turned up after the screen was opened, so each can arrive with
 * a movement instead of simply being there on the next render.
 *
 * Nothing is marked new on the first load — a counter opening a tab mid
 * service would otherwise get every ticket on the screen animating at once.
 *
 * The set empties again once the animation has had time to run, so a
 * re-render for an unrelated reason (the minute ticking over on every card)
 * does not replay it.
 */
export function useArrivals(ids: string[], ms = 600): ReadonlySet<string> {
  const seen = useRef<Set<string> | null>(null);
  const [arrived, setArrived] = useState<Set<string>>(() => new Set());
  // Compared as a string so a new array of the same ids is not a change.
  const key = ids.join(",");

  useEffect(() => {
    const current = new Set(key ? key.split(",") : []);
    if (seen.current === null) {
      seen.current = current;
      return;
    }
    const known = seen.current;
    seen.current = current;
    const fresh = [...current].filter((id) => !known.has(id));
    if (fresh.length === 0) return;

    setArrived(new Set(fresh));
    const timer = setTimeout(() => setArrived(new Set()), ms);
    return () => clearTimeout(timer);
  }, [key, ms]);

  return arrived;
}
