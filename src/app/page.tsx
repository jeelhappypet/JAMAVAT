import type { Metadata } from "next";

/**
 * Jamavat's own website. Phase 5B replaces this with the Landing artboard
 * (hero, features, pricing, FAQ and the inquiry form) plus the keyword pages
 * and the JSON-LD that go with it.
 */
export const metadata: Metadata = {
  title: "QR table ordering & kitchen software for restaurants",
  description:
    "Jamavat is restaurant management software for Indian restaurants: guests order from the table by QR, each kitchen sees only its own dishes, and you get the day's sales in one place.",
};

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[720px] flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-[clamp(30px,5vw,46px)] font-extrabold leading-tight tracking-tight">
        QR table ordering &amp; kitchen software for restaurants
      </h1>
      <p className="text-lg leading-relaxed text-text-muted">
        Guests scan, order and track their food from the table. Each kitchen gets only its own dishes, and the whole day&apos;s
        sales sit in one place — on any phone or tablet, in English and ગુજરાતી.
      </p>
    </main>
  );
}
