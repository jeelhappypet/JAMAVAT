"use client";

import { playNewOrderBeep } from "@/lib/utils/beep";
import { localName, type Lang, type Translate } from "@/lib/i18n/messages";

/**
 * System notifications for new orders ("New order · 4A"), so staff notice
 * one even with the screen in another tab or the app in the background.
 * Permission is asked on the staff member's first tap — browsers refuse to
 * ask without one.
 */

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function askNotificationPermission() {
  if (!notificationsSupported() || Notification.permission !== "default") return;
  void Notification.requestPermission().catch(() => undefined);
}

interface OrderNotification {
  title: string;
  body: string;
  /** One notification per order: a re-fetch of the same order replaces it instead of stacking. */
  tag: string;
}

export async function showOrderNotification({ title, body, tag }: OrderNotification) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  const options: NotificationOptions & { renotify?: boolean } = {
    body,
    tag,
    renotify: true,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    // On screen the page's own chime already plays; in the background let the phone ring too.
    silent: document.visibilityState === "visible",
  };
  try {
    // Android Chrome only shows notifications through the service worker.
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, options);
      return;
    }
    new Notification(title, options);
  } catch {
    // Notifications are a nudge on top of the screen — never break it.
  }
}

interface NewOrder {
  id: string;
  tokenNumber: number;
  seatCode?: string;
  note?: string;
  items: { nameSnapshot: string; nameGuSnapshot?: string; quantity: number }[];
}

/** At most this many notifications for one refetch — a backlog after a reconnect shouldn't flood the phone. */
const MAX_NOTIFICATIONS = 3;

/** New orders reached this screen: chime (if the sound is on) and one notification per order. */
export function alertNewOrders(orders: NewOrder[], { t, lang, sound }: { t: Translate; lang: Lang; sound: boolean }) {
  if (orders.length === 0) return;
  if (sound) playNewOrderBeep();
  for (const order of orders.slice(0, MAX_NOTIFICATIONS)) {
    const items = order.items.map((item) => `${localName(lang, item.nameSnapshot, item.nameGuSnapshot)} × ${item.quantity}`).join(", ");
    void showOrderNotification({
      title: order.seatCode ? t("alert.newOrderSeat", { code: order.seatCode }) : t("alert.newParcel", { n: order.tokenNumber }),
      body: order.note ? `${items}\n${t("kitchen.note", { note: order.note })}` : items,
      tag: `order-${order.id}`,
    });
  }
}
