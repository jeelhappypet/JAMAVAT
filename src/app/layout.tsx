import type { Metadata, Viewport } from "next";
import { Noto_Sans_Gujarati, Plus_Jakarta_Sans } from "next/font/google";
import { OfflineIndicator } from "@/components/realtime/OfflineIndicator";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
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

const appName = process.env.NEXT_PUBLIC_APP_NAME || "જમાવટ";

export const metadata: Metadata = {
  title: appName,
  description: "જમાવટ — રેસ્ટોરન્ટ ઓર્ડર મેનેજમેન્ટ",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: appName,
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
          <OfflineIndicator />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
