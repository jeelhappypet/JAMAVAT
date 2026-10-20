import type { Metadata, Viewport } from "next";
import { Noto_Sans_Gujarati, Plus_Jakarta_Sans } from "next/font/google";
import { OfflineIndicator } from "@/components/realtime/OfflineIndicator";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { TopProgress } from "@/components/shell/TopProgress";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { getLang } from "@/lib/i18n/server";
import "./globals.css";

// Latin text renders in Plus Jakarta Sans; Gujarati glyphs fall through to Noto Sans Gujarati.
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const notoSansGujarati = Noto_Sans_Gujarati({
  variable: "--font-noto-gujarati",
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
  themeColor: "#c2410c",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getLang();

  return (
    <html lang={lang} className={`${plusJakartaSans.variable} ${notoSansGujarati.variable} h-full antialiased`}>
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
