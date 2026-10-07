export const REALTIME_EVENTS = {
  /** A guest placed a QR order — waiting for the counter (kitchens don't see it yet). */
  ORDER_PLACED: "order:placed",
  /** Counter accepted a QR order — it's now on the kitchen screens. */
  ORDER_ACCEPTED: "order:accepted",
  ORDER_REJECTED: "order:rejected",
  ORDER_CREATED: "order:created",
  /** Some kitchen marked its part of an order ready (the order may still be cooking elsewhere). */
  ORDER_ITEMS_READY: "order:items-ready",
  ORDER_READY: "order:ready",
  ORDER_COMPLETED: "order:completed",
  ORDER_CANCELLED: "order:cancelled",
  MENU_UPDATED: "menu:updated",
  /** Admin changed which categories a kitchen login receives. */
  ROUTING_UPDATED: "staff:routing-updated",
  /** A QR was taken, freed, added or regenerated. */
  SEAT_UPDATED: "seat:updated",
  ADMIN_STATS_UPDATED: "admin:stats-updated",
} as const;

export type RealtimeEvent = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

/**
 * Every staff screen listens on one private channel. Private = Pusher only
 * lets a browser subscribe after /api/pusher/auth confirms a staff session.
 * (Becomes one channel per restaurant in the multi-restaurant phase.)
 */
export const STAFF_CHANNEL = "private-staff";
