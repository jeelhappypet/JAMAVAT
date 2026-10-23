import { Noto_Serif_Gujarati } from "next/font/google";

/**
 * The Gujarati half of the website's headline voice, so a ગુજરાતી headline
 * is the same voice as an English one rather than the body font in disguise.
 *
 * 115KB, and only the `/gu` pages set a Gujarati headline — the English
 * pages are the ones people find us with, so they don't preload it.
 */
const displayGujarati = Noto_Serif_Gujarati({
  variable: "--font-display-gujarati",
  subsets: ["gujarati"],
  weight: ["600", "700"],
  display: "swap",
});

/** Put on the `/gu` wrapper, where `.heading` can inherit it. */
export const DISPLAY_GUJARATI_VARIABLE = displayGujarati.variable;
