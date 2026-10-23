import { Fraunces } from "next/font/google";

/**
 * The website's headline voice (`.heading` in `globals.css`): a warm,
 * high-contrast serif. Latin only — the ગુજરાતી cut is its own module,
 * loaded by the `/gu` pages that actually set Gujarati headlines.
 *
 * Imported by the `(site)` layout and nothing else. Next attributes a font
 * to the routes whose module graph reaches its loader call, so keeping the
 * display faces out of the root layout is what stops the staff app and the
 * guest QR pages from preloading a serif they never draw.
 */
const displayLatin = Fraunces({
  variable: "--font-display-latin",
  subsets: ["latin"],
  // Two static cuts, not the variable file: `axes` and `weight` are mutually
  // exclusive, and two weights are all the headings use.
  weight: ["600", "700"],
  display: "swap",
});

/** Put on the website's own wrapper, where `.heading` can inherit it. */
export const DISPLAY_VARIABLES = displayLatin.variable;
