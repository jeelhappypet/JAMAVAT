import { cookies } from "next/headers";
import { LANG_COOKIE, makeTranslator, toLang, type Lang, type Translate } from "@/lib/i18n/messages";

export async function getLang(): Promise<Lang> {
  const cookieStore = await cookies();
  return toLang(cookieStore.get(LANG_COOKIE)?.value);
}

/** For server components and API routes — error messages follow the viewer's language too. */
export async function getTranslator(): Promise<Translate> {
  return makeTranslator(await getLang());
}
