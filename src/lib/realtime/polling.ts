/** Without Pusher: poll so a screen is never more than a few seconds behind. */
export const POLL_MS = 5000;
/** With Pusher: a quiet safety resync in case a push was missed. */
export const SAFETY_RESYNC_MS = 60000;
