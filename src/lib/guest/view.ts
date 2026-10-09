import type { GuestStateDTO } from "@/types";

/**
 * Which step of the guest flow a QR page is showing. It lives in the URL
 * (`?v=`) because a phone browser often reloads the document when the guest
 * goes back — without it the step would be recomputed from scratch and the
 * guest would land back on "order placed" instead of where they came from.
 * Shared by the server page and GuestApp, so both resolve it the same way.
 */
export type GuestView = "menu" | "cart" | "verify" | "status" | "busy";

const VIEWS: GuestView[] = ["menu", "cart", "verify", "status", "busy"];

/** The menu is the bare URL, so a scanned QR link never carries a step. */
export function viewFromSearch(value: string | undefined): GuestView | undefined {
  return VIEWS.find((view) => view === value && view !== "menu");
}

/**
 * Where a guest with no step in the URL starts.
 *
 * The bare QR URL always means the menu, even with an order already cooking:
 * it is the entry the phone's back button walks back to, so resolving it to
 * the "order placed" screen would trap the guest there after every back press.
 * A running order is one tap away from the menu's "My orders" button instead.
 */
export function startView(state: GuestStateDTO): GuestView {
  // Just paid (or the counter closed the table): thank them before anything else.
  if (state.ended && state.lock !== "mine") return "status";
  if (state.lock === "taken") return "busy";
  return "menu";
}

/** The URL a step lives at, keeping the QR's own path. */
export function guestUrlFor(pathname: string, view: GuestView): string {
  return `${pathname}${view === "menu" ? "" : `?v=${view}`}`;
}
