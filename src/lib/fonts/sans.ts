import { Noto_Sans_Gujarati, Schibsted_Grotesk } from "next/font/google";

/**
 * The body typeface, in both scripts: Schibsted Grotesk for Latin, Noto Sans
 * Gujarati for ગુજરાતી. One `font-family` serves a sentence that mixes them,
 * because the Latin glyphs come from the first family in the stack (see
 * `--font-sans` in `globals.css`).
 *
 * This is the only font pair every page needs — the website's display serif
 * lives in `./display` and is loaded by the website's layout alone, so a
 * guest's phone and a counter screen don't download 150KB of serif they
 * never render.
 */
const sansLatin = Schibsted_Grotesk({
  variable: "--font-sans-latin",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

/**
 * `subsets: ["gujarati"]` only. Its Latin cut would be dead weight (30KB
 * preloaded on every page): Latin never reaches this family, Schibsted
 * Grotesk is ahead of it in every stack that uses it.
 */
const sansGujarati = Noto_Sans_Gujarati({
  variable: "--font-sans-gujarati",
  subsets: ["gujarati"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

/** Put on `<html>` by the root layout. */
export const SANS_VARIABLES = `${sansLatin.variable} ${sansGujarati.variable}`;
