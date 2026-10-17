import { notFound, redirect } from "next/navigation";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { WelcomeForm } from "@/components/auth/WelcomeForm";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { appPath } from "@/lib/auth/access";
import { checkInvite } from "@/lib/auth/invite";
import { getRestaurantBySlug } from "@/lib/restaurant";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";

/** First run for a restaurant HQ just created: the invite link from their email. */
export default async function WelcomePage({ params, searchParams }: PageProps<"/r/[slug]/welcome">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const found = await getRestaurantBySlug(slug);
  if (!found) notFound();
  if (found.movedTo) redirect(appPath(found.movedTo, "/welcome"));

  const invite = typeof query.invite === "string" ? query.invite : "";
  const checked = invite ? await checkInvite(found.restaurant.id, invite) : null;
  if (checked?.ok) {
    return <WelcomeForm slug={found.restaurant.slug} restaurantName={found.restaurant.name} invite={invite} />;
  }

  const t = await getTranslator();
  const message: MessageKey = !invite ? "welcome.noInvite" : checked?.reason === "USED" ? "welcome.used" : "welcome.expired";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface-muted">
      <AuthHeader restaurantName={found.restaurant.name} />
      <main className="flex flex-1 items-center justify-center px-[clamp(16px,3vw,32px)] pb-10 pt-4">
        <Card className="flex w-full max-w-[480px] flex-col gap-4">
          <h1 className="text-[26px] font-extrabold tracking-tight">{t("welcome.title")}</h1>
          <Alert tone="warning">{t(message, { name: found.restaurant.name })}</Alert>
          <Button href={appPath(found.restaurant.slug, "/login")} size="lg" variant="secondary">
            {t("welcome.signIn")}
          </Button>
        </Card>
      </main>
    </div>
  );
}
