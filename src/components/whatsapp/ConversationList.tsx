"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import { formatWaNumber } from "@/lib/whatsapp/phone";
import { cn } from "@/components/ui/cn";
import { TextField } from "@/components/ui/TextField";
import { LoadingState } from "@/components/ui/LoadingState";
import { Alert } from "@/components/ui/Alert";
import type { WhatsAppConversationDTO } from "@/types";
import { listTime } from "./format";

interface ConversationListProps {
  conversations: WhatsAppConversationDTO[];
  loading: boolean;
  error: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function Avatar({ name, waId, size = 44 }: { name?: string; waId: string; size?: number }) {
  const letter = (name?.trim().charAt(0) || waId.slice(-2)).toUpperCase();
  return (
    <span aria-hidden className="flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-extrabold text-emerald-800" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {letter}
    </span>
  );
}

export function ConversationList({ conversations, loading, error, query, onQueryChange, selectedId, onSelect }: ConversationListProps) {
  const { t, lang } = useI18n();
  const searching = query.trim().length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border p-3">
        <TextField type="search" size="sm" aria-label={t("wa.search")} placeholder={t("wa.search")} value={query} onChange={(e) => onQueryChange(e.target.value)} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {error ? <Alert className="m-3">{error}</Alert> : null}
        {loading ? (
          <LoadingState />
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-1 px-6 py-12 text-center">
            <p className="text-[15px] font-bold text-stone-700">{searching ? t("wa.noResults", { q: query.trim() }) : t("wa.empty")}</p>
            {searching ? null : <p className="text-sm text-text-muted">{t("wa.emptyHint")}</p>}
          </div>
        ) : (
          <ul>
            {conversations.map((conversation) => {
              const active = conversation.id === selectedId;
              const title = conversation.customerName || formatWaNumber(conversation.waId);
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(conversation.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn("flex w-full items-center gap-3 border-b border-stone-100 px-3 py-3 text-left", active ? "bg-emerald-50" : "hover:bg-stone-50")}
                  >
                    <Avatar name={conversation.customerName} waId={conversation.waId} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[15px] font-bold">{title}</span>
                        <span className={cn("shrink-0 text-xs", conversation.unreadCount > 0 ? "font-bold text-emerald-700" : "text-text-muted")}>
                          {listTime(conversation.lastMessageAt, lang, t)}
                        </span>
                      </span>
                      {conversation.customerName ? <span className="truncate text-xs text-text-muted">{formatWaNumber(conversation.waId)}</span> : null}
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] text-stone-600">
                          {conversation.lastMessageDirection === "outbound" ? <span className="text-text-muted">{t("wa.you")} </span> : null}
                          {conversation.lastMessage}
                        </span>
                        {conversation.unreadCount > 0 ? (
                          <span aria-label={t("wa.unread", { n: conversation.unreadCount })} className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[11px] font-extrabold text-white">
                            {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
