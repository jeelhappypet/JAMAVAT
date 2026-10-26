"use client";

import { Alert } from "@/components/ui/Alert";
import { WhatsAppInbox } from "@/components/whatsapp/WhatsAppInbox";

/**
 * Every restaurant's WhatsApp in one place. One number serves them all, so
 * there is nothing to pick first — each chat says which restaurant it belongs
 * to, and HQ can reply with text, a photo or an approved template.
 */
export function HqWhatsAppScreen({ canSend }: { canSend: boolean }) {
  return (
    <>
      <h1 className="text-[22px] font-extrabold">WhatsApp</h1>
      {!canSend ? <Alert tone="warning">WhatsApp sending isn&apos;t set up on the server, so this is read-only.</Alert> : null}
      <WhatsAppInbox canSend={canSend} hq />
    </>
  );
}
