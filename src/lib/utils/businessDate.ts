const BUSINESS_TIMEZONE = "Asia/Kolkata";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Returns the current restaurant business date as YYYY-MM-DD in Asia/Kolkata. */
export function getBusinessDate(date: Date = new Date()): string {
  return formatter.format(date);
}
