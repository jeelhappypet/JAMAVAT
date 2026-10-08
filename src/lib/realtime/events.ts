export const REALTIME_EVENTS = {
  /** New order from the counter or a guest's QR — straight onto the kitchen screens. */
  ORDER_CREATED: "order:created",
  /** Some kitchen marked its part of an order ready (the order may still be cooking elsewhere). */
  ORDER_ITEMS_READY: "order:items-ready",
  ORDER_READY: "order:ready",
  ORDER_COMPLETED: "order:completed",
  ORDER_CANCELLED: "order:cancelled",
  MENU_UPDATED: "menu:updated",
  /** Admin changed which categories a kitchen login receives. */
  ROUTING_UPDATED: "staff:routing-updated",
  /** A QR was taken, settled, freed, added or regenerated. */
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

/** Public per-QR channel the guest page listens on (see notifyGuestSeat). */
export const guestChannel = (seatToken: string) => `seat-${seatToken}`;
export const GUEST_UPDATE_EVENT = "guest:update";

/**
 * WhatsApp inbox events go on their own private channel, authorised only for
 * roles that may open /whatsapp — kitchen screens never receive customer chats.
 */
export const WHATSAPP_CHANNEL = "private-whatsapp";

export const WHATSAPP_EVENTS = {
  /** A customer's message was saved. Payload: { conversation, message }. */
  MESSAGE_NEW: "whatsapp:message:new",
  /** Staff sent a message (Meta accepted it). Payload: { conversation, message }. */
  MESSAGE_SENT: "whatsapp:message:sent",
  /** sent / delivered / read / failed from Meta. Payload: { conversationId, messageId, status, error? }. */
  MESSAGE_STATUS: "whatsapp:message:status",
  /** Unread count or preview changed. Payload: { conversation }. */
  CONVERSATION_UPDATED: "whatsapp:conversation:updated",
} as const;

export type WhatsAppEvent = (typeof WHATSAPP_EVENTS)[keyof typeof WHATSAPP_EVENTS];
