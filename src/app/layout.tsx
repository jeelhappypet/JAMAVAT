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
  // The .ico (16/32/48, for browser tabs) is served from `public/`, not from
  // `app/favicon.ico`: the app-folder convention appends a build hash to the
  // URL (`/favicon.ico?favicon.1g7wuota.ico`), and Google asks for a site's
  // favicon to live at a stable URL — a link that changes with every deploy
  // sends it back to square one each time.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
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
