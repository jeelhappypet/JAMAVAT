import type { Metadata, Viewport } from "next";
import { OfflineIndicator } from "@/components/realtime/OfflineIndicator";
import { TopProgress } from "@/components/shell/TopProgress";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { SANS_VARIABLES } from "@/lib/fonts/sans";
import { getLang } from "@/lib/i18n/server";
import "./globals.css";

const appName = "Jamavat";

/**
 * The root layout serves three different things: Jamavat's own website,
 * every restaurant's app under `/r/{slug}` and the guest QR pages. Titles,
 * manifests and robots rules therefore belong to those pages, not here —
 * and so do the two things only one of them needs: the display serif
 * (`(site)/layout.tsx`) and the service worker (`r/[slug]/layout.tsx`).
 * Carrying either here made a guest's phone download fonts and install a
 * worker for an app it will never open.
 */
export const metadata: Metadata = {
  title: { default: appName, template: `%s · ${appName}` },
  // Google shows a site's favicon only if it's a square multiple of 48px, and draws it in a circle on light
  // and dark results — so these are opaque white squares with the mark inset, not the transparent PWA icons.
  //
  // Two things were wrong here, both found by comparing a result that does
  // show its icon with ours, which showed Vercel's:
  //
  // 1. The .ico came from `app/favicon.ico`, which Next serves with a build
  //    hash in the query (`/favicon.ico?favicon.1g7wuota.ico`). Google asks
  //    for a favicon at a *stable* URL and only looks when it crawls the home
  //    page, so every deploy sent it back to the start. It is a plain
  //    `/favicon.ico` out of `public/` now.
  // 2. The .ico held 16/32/48 only. The site whose icon Google does show
  //    carries 16 → 256 in one file, so this one now carries 16 → 192
  //    (`scripts/make-favicon.py`), and 96px is offered as a PNG as well.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48 96x96 192x192", type: "image/x-icon" },
      { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/favicon-96.png", sizes: "96x96", type: "image/png" },
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
    <html lang={lang} className={`${SANS_VARIABLES} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <I18nProvider lang={lang}>
          <TopProgress />
          <OfflineIndicator />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
