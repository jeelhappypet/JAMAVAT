import type { Metadata } from "next";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Privacy Policy · Jamavat" };

const SECTIONS: { title: MessageKey; body: MessageKey[]; id?: string }[] = [
  { title: "privacy.whoTitle", body: ["privacy.who"] },
  { title: "privacy.collectTitle", body: ["privacy.collectGuests", "privacy.collectWhatsApp", "privacy.collectStaff"] },
  { title: "privacy.useTitle", body: ["privacy.use"] },
  { title: "privacy.shareTitle", body: ["privacy.share"] },
  { title: "privacy.keepTitle", body: ["privacy.keep"] },
  { title: "privacy.deleteTitle", body: ["privacy.delete"], id: "delete" },
  { title: "privacy.changesTitle", body: ["privacy.changes"] },
];

/** Public privacy policy (also the data-deletion page Meta asks for: /privacy#delete). */
export default async function PrivacyPage() {
  const t = await getTranslator();
  // The address guests already get OTP and bill emails from.
  const contact = process.env.SMTP_USER?.trim();

  return (
    <main className="min-h-dvh bg-surface-muted px-4 py-10">
      <Card padding="none" className="mx-auto flex max-w-[760px] flex-col gap-6 p-6 sm:p-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-[28px] font-extrabold tracking-tight">{t("privacy.title")}</h1>
          <p className="text-sm text-text-muted">{t("privacy.updated", { date: "8 October 2026" })}</p>
        </header>
        {SECTIONS.map((section) => (
          <section key={section.title} id={section.id} className="flex scroll-mt-6 flex-col gap-2">
            <h2 className="text-lg font-extrabold">{t(section.title)}</h2>
            {section.body.map((key) => (
              <p key={key} className="text-[15px] leading-relaxed text-stone-700">
                {t(key)}
              </p>
            ))}
          </section>
        ))}
        {contact ? (
          <p className="text-[15px] text-stone-700">
            {t("privacy.contact")}{" "}
            <a className="font-bold text-brand underline" href={`mailto:${contact}`}>
              {contact}
            </a>
          </p>
        ) : null}
      </Card>
    </main>
  );
}
