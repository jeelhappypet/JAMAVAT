export const REALTIME_EVENTS = {
  ORDER_CREATED: "order:created",
  ORDER_COMPLETED: "order:completed",
  ORDER_CANCELLED: "order:cancelled",
  MENU_UPDATED: "menu:updated",
  ADMIN_STATS_UPDATED: "admin:stats-updated",
} as const;

export type RealtimeEvent = (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];
