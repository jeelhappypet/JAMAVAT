import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { zodErrorMessage } from "@/lib/i18n/zod";
import type { MessageKey, Translate } from "@/lib/i18n/messages";

export function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Shared error handling for route handlers: invalid input → 400 with a
 * translated message, duplicate key → 409, anything else → 500 `failKey`.
 */
export async function respond(
  t: Translate,
  failKey: MessageKey,
  work: () => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ZodError) return jsonError(zodErrorMessage(error, t), 400);
    if (isDuplicateKeyError(error)) return jsonError(t("err.duplicateName"), 409);
    console.error(error);
    return jsonError(t(failKey), 500);
  }
}
