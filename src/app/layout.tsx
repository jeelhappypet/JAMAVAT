import type { Metadata, Viewport } from "next";
import { Fraunces, Noto_Sans_Gujarati, Noto_Serif_Gujarati, Schibsted_Grotesk } from "next/font/google";
import { OfflineIndicator } from "@/components/realtime/OfflineIndicator";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { TopProgress } from "@/components/shell/TopProgress";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getLang } from "@/lib/i18n/server";
import "./globals.css";

/**
 * Two typefaces, each in both scripts, so a ગુજરાતી heading is the same
 * voice as an English one rather than the body font in disguise:
 *
 * - display (Fraunces / Noto Serif Gujarati) for headlines only. A warm,
 *   high-contrast serif is what stops the page reading like every other
 *   SaaS template — those all run one geometric sans at three sizes.
 * - sans (Schibsted Grotesk / Noto Sans Gujarati) for body and the whole
 *   staff app, where a serif at 13px on a counter screen would be wrong.
 *
 * Latin glyphs come from the first family in each stack and Gujarati from
 * the second, so one `font-family` serves a sentence that mixes them.
 */
const fraunces = Fraunces({
  variable: "--font-display-latin",
  subsets: ["latin"],
  // Two static cuts, not the variable file: `axes` and `weight` are mutually
  // exclusive, and two weights are all the headings use.
  weight: ["600", "700"],
  display: "swap",
});

const notoSerifGujarati = Noto_Serif_Gujarati({
  variable: "--font-display-gujarati",
  subsets: ["gujarati"],
  weight: ["600", "700"],
  display: "swap",
});

const schibstedGrotesk = Schibsted_Grotesk({
  variable: "--font-sans-latin",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const notoSansGujarati = Noto_Sans_Gujarati({
  variable: "--font-sans-gujarati",
  subsets: ["gujarati", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const appName = "Jamavat";

/**
 * The root layout serves three different things: Jamavat's own website,
 * every restaurant's app under `/r/{slug}` and the guest QR pages. Titles,
 * manifests and robots rules therefore belong to those pages, not here.
 */
export const metadata: Metadata = {
  title: { default: appName, template: `%s · ${appName}` },
  // Google shows a site's favicon only if it's a square multiple of 48px, and draws it in a circle on light
  // and dark results — so these are opaque white squares with the mark inset, not the transparent PWA icons.
  // (`app/favicon.ico` carries 16/32/48 for browser tabs.)
  icons: {
    icon: [
      { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#b2560a",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getLang();

  return (
    <html
      lang={lang}
      className={`${schibstedGrotesk.variable} ${notoSansGujarati.variable} ${fraunces.variable} ${notoSerifGujarati.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider lang={lang}>
          <ServiceWorkerRegister />
          <TopProgress />
          <OfflineIndicator />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
