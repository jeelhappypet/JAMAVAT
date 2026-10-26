"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { appPath } from "@/lib/auth/access";

export interface RestaurantContextValue {
  /** The restaurant's database id — used for its realtime channels (a slug can be renamed). */
  id: string;
  slug: string;
  name: string;
  /** Restaurant-relative path → the link to use ("/counter" → "/r/kiran/counter"). */
  path: (path?: string) => string;
}

const RestaurantContext = createContext<RestaurantContextValue | null>(null);

/**
 * One restaurant's app. Screens keep writing their own paths ("/counter");
 * `path()` puts them under this restaurant's link, so the same screens serve
 * every restaurant and nothing hardcodes a slug.
 */
export function RestaurantProvider({ id, slug, name, children }: { id: string; slug: string; name: string; children: ReactNode }) {
  const value = useMemo<RestaurantContextValue>(() => ({ id, slug, name, path: (path = "/") => appPath(slug, path) }), [id, slug, name]);
  return <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>;
}

export function useRestaurant(): RestaurantContextValue {
  const value = useContext(RestaurantContext);
  if (!value) throw new Error("useRestaurant must be used inside a restaurant's app");
  return value;
}

/**
 * The restaurant's id, or null outside a restaurant's app. HQ renders some of
 * the same screens (the WhatsApp inbox) with the restaurant chosen from a
 * picker rather than from the URL, and has no provider to read.
 */
export function useOptionalRestaurantId(): string | null {
  return useContext(RestaurantContext)?.id ?? null;
}

/** Shorthand for the common case: `const path = useAppPath(); path("/counter")`. */
export function useAppPath(): RestaurantContextValue["path"] {
  return useRestaurant().path;
}
