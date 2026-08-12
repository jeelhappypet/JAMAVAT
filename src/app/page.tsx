import { AppLogo } from "@/components/ui/AppLogo";
import { HomeActionCard } from "@/components/home/HomeActionCard";

const ICONS = {
  newOrder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  liveOrder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  pendingOrder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16l-1.5 9H5.5L4 4Z" />
      <path d="M8 13v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
};

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-10 px-6 py-10">
      <AppLogo size="lg" withWordmark={false} />

      <div className="grid w-full max-w-2xl grid-cols-2 gap-4">
        <HomeActionCard href="/new-order" label="નવો ઓર્ડર" icon={ICONS.newOrder} accent="brand" />
        <HomeActionCard href="/live-order" label="ચાલુ ઓર્ડર" icon={ICONS.liveOrder} accent="success" />
        <HomeActionCard href="/pending-order" label="બાકી ઓર્ડર" icon={ICONS.pendingOrder} accent="danger" />
        <HomeActionCard href="/menu" label="મેનુ" icon={ICONS.menu} accent="neutral" />
      </div>
    </main>
  );
}
