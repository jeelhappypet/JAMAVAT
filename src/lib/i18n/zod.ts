import type { ZodError } from "zod";
import type { MessageKey, Translate } from "@/lib/i18n/messages";

const FIELD_MESSAGES: Record<string, MessageKey> = {
  pin: "err.pinFormat",
  newPin: "err.pinFormat",
  currentPin: "err.pinFormat",
  name: "err.enterName",
  restaurantName: "err.enterRestaurantName",
  setupKey: "err.enterSetupKey",
};

/** Zod's own messages are English-only; map the first failing field to a translated one. */
export function zodErrorMessage(error: ZodError, t: Translate): string {
  const issue = error.issues[0];
  if (!issue) return t("err.checkForm");
  if (issue.code === "custom") return t("err.pinSame");
  if (issue.code === "too_big" && issue.path[0] === "name") return t("err.nameTooLong");
  const key = FIELD_MESSAGES[String(issue.path[0] ?? "")];
  return t(key ?? "err.checkForm");
}
