import type { SponsorLeadDocument } from "@/models/SponsorLead";
import type { OutreachChannel, OutreachTouchDTO, SponsorLeadDTO, SponsorLeadStatus } from "@/types";
import { whatsappLink, whatsappText } from "./compose";
import { sender } from "./mailer";
import { whatsappProblem } from "./whatsapp";

const iso = (date: Date | null | undefined) => (date ? new Date(date).toISOString() : undefined);

function toTouchDTO(touch: SponsorLeadDocument["touches"][number]): OutreachTouchDTO {
  return {
    channel: touch.channel as OutreachChannel,
    step: touch.step,
    at: new Date(touch.at).toISOString(),
    summary: touch.summary ?? undefined,
    text: touch.text ?? undefined,
    deliveredAt: iso(touch.deliveredAt),
    readAt: iso(touch.readAt),
    failure: touch.failure ?? undefined,
  };
}

export function toSponsorLeadDTO(lead: SponsorLeadDocument): SponsorLeadDTO {
  // The bot sends WhatsApp itself once a template and a separate number are
  // set up. Until then HQ needs the tap link, so the row carries one.
  const needsTap = Boolean(whatsappProblem()) && Boolean(lead.phoneKey);
  return {
    id: String(lead._id),
    business: lead.business,
    category: lead.category,
    area: lead.area,
    ownerName: lead.ownerName ?? undefined,
    email: lead.email ?? undefined,
    phone: lead.phone ?? undefined,
    phoneKey: lead.phoneKey ?? undefined,
    instagram: lead.instagram ?? undefined,
    sessionsInArea: lead.sessionsInArea ?? 0,
    lang: lead.lang === "en" ? "en" : "gu",
    status: lead.status as SponsorLeadStatus,
    step: lead.step ?? 0,
    nextActionAt: iso(lead.nextActionAt),
    repliedAt: iso(lead.repliedAt),
    closedReason: lead.closedReason ?? undefined,
    notes: lead.notes ?? undefined,
    maps: lead.maps ?? undefined,
    touches: (lead.touches ?? []).map(toTouchDTO),
    whatsappLink: needsTap ? whatsappLink(lead.phoneKey!, whatsappText(lead, sender())) : undefined,
  };
}
