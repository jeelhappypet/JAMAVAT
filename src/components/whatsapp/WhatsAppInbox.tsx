"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { redirectToLoginIfUnauthorized } from "@/lib/auth/client";
import { useRealtime, useRealtimeChannels } from "@/lib/realtime/useRealtime";
import { WHATSAPP_EVENTS, whatsAppChannel } from "@/lib/realtime/events";
import { POLL_MS, SAFETY_RESYNC_MS } from "@/lib/realtime/polling";
import { usePeriodicRefresh } from "@/lib/utils/usePeriodicRefresh";
import { cn } from "@/components/ui/cn";
import { IconButton } from "@/components/ui/IconButton";
import { RealtimeStatus } from "@/components/realtime/RealtimeStatus";
import type { WhatsAppConversationDTO, WhatsAppMessageDTO, WhatsAppMessageStatus } from "@/types";
import { ConversationList } from "./ConversationList";
import { ChatPane } from "./ChatPane";
import { byTime } from "./format";

type ChatData = { conversation: WhatsAppConversationDTO; messages: WhatsAppMessageDTO[]; hasMore: boolean };
type MessagePayload = { conversation: WhatsAppConversationDTO; message: WhatsAppMessageDTO };
type StatusPayload = { conversationId: string; messageId: string; status: WhatsAppMessageStatus; error?: WhatsAppMessageDTO["error"] };

const byLatest = (a: WhatsAppConversationDTO, b: WhatsAppConversationDTO) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? "");
const visible = () => document.visibilityState === "visible";

/**
 * WhatsApp inbox: chat list on the left, the open chat on the right (one at
 * a time on a phone). Pusher's private-whatsapp channel brings new messages,
 * sends from other screens and delivery ticks; polling is only the fallback.
 */
export interface WhatsAppInboxProps {
  canSend: boolean;
  /** Where the back arrow goes. Omitted in HQ, which has its own header. */
  homeHref?: string;
  /**
   * HQ's view: every restaurant's chats in one list, on HQ's own endpoints
   * and guarded by an HQ session. It can also send photos and approved
   * templates, which is how a chat past its 24-hour window gets reopened.
   * Left out, this is one restaurant's own screen.
   */
  hq?: boolean;
}

/** The restaurant's own routes, or HQ's, which are not tenant-scoped. */
function endpoints(hq?: boolean) {
  if (!hq) {
    return {
      list: (q: string) => `/api/whatsapp/conversations${q ? `?q=${encodeURIComponent(q)}` : ""}`,
      messages: (id: string, before?: string) => `/api/whatsapp/conversations/${id}/messages${before ? `?before=${encodeURIComponent(before)}` : ""}`,
      read: (id: string) => `/api/whatsapp/conversations/${id}/read`,
      send: () => "/api/whatsapp/messages/send",
    };
  }
  return {
    list: (q: string) => `/api/hq/whatsapp/conversations${q ? `?q=${encodeURIComponent(q)}` : ""}`,
    messages: (id: string, before?: string) => `/api/hq/whatsapp/conversations/${id}/messages${before ? `?before=${encodeURIComponent(before)}` : ""}`,
    read: (id: string) => `/api/hq/whatsapp/conversations/${id}/read`,
    send: () => "/api/hq/whatsapp/send",
  };
}

export function WhatsAppInbox({ canSend, homeHref, hq }: WhatsAppInboxProps) {
  const { t } = useI18n();
  // Memoised: it goes in the data callbacks' dependency lists, and a fresh
  // object every render would re-create every one of them on every keystroke.
  const api = useMemo(() => endpoints(hq), [hq]);
  const [conversations, setConversations] = useState<WhatsAppConversationDTO[]>([]);
  // HQ only: the restaurants whose WhatsApp channels this screen listens on.
  const [restaurantIds, setRestaurantIds] = useState<string[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatData | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const queryRef = useRef("");
  const selectedRef = useRef<string | null>(null);
  const lastListLoad = useRef(0);

  // ---- data
  const loadConversations = useCallback(async () => {
    const q = queryRef.current;
    lastListLoad.current = Date.now();
    try {
      const res = await fetch(api.list(q), { cache: "no-store" });
      if (redirectToLoginIfUnauthorized(res)) return;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error);
      if (q !== queryRef.current) return; // a newer search already went out
      setConversations(data.conversations);
      if (Array.isArray(data.restaurantIds)) setRestaurantIds(data.restaurantIds);
      setListError(null);
    } catch (err) {
      setListError(err instanceof Error && err.message ? err.message : t("wa.loadFailed"));
    } finally {
      setListLoading(false);
    }
  }, [api, t]);

  const fetchChat = useCallback(
    async (id: string, before?: string): Promise<ChatData | null> => {
      const res = await fetch(api.messages(id, before), { cache: "no-store" });
      if (redirectToLoginIfUnauthorized(res)) return null;
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("wa.loadFailed"));
      return data;
    },
    [api, t]
  );

  /** Puts a changed chat in the list (newest first) and in the open chat's header. */
  const upsertConversation = useCallback((next: WhatsAppConversationDTO) => {
    setConversations((prev) => {
      const known = prev.some((conversation) => conversation.id === next.id);
      if (!known && queryRef.current) return prev; // searching: don't slip unrelated chats into the results
      return (known ? prev.map((conversation) => (conversation.id === next.id ? next : conversation)) : [next, ...prev]).sort(byLatest);
    });
    setChat((prev) => (prev && prev.conversation.id === next.id ? { ...prev, conversation: next } : prev));
  }, []);

  const markRead = useCallback(
    async (id: string) => {
      const res = await fetch(api.read(id), { method: "POST" });
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (data?.conversation) upsertConversation(data.conversation);
    },
    [api, upsertConversation]
  );

  async function openChat(id: string) {
    selectedRef.current = id;
    setSelectedId(id);
    setChatError(null);
    setSendError(null);
    setChatLoading(true);
    setChat((prev) => (prev?.conversation.id === id ? prev : null));
    try {
      const data = await fetchChat(id);
      if (!data || selectedRef.current !== id) return;
      setChat(data);
      if (data.conversation.unreadCount > 0) void markRead(id);
    } catch (err) {
      if (selectedRef.current === id) setChatError(err instanceof Error ? err.message : t("wa.loadFailed"));
    } finally {
      if (selectedRef.current === id) setChatLoading(false);
    }
  }

  async function loadEarlier() {
    const current = chat;
    if (!current || current.messages.length === 0) return;
    try {
      const data = await fetchChat(current.conversation.id, current.messages[0].timestamp);
      if (!data) return;
      setChat((prev) =>
        prev && prev.conversation.id === current.conversation.id
          ? { ...prev, messages: [...data.messages.filter((m) => !prev.messages.some((p) => p.id === m.id)), ...prev.messages], hasMore: data.hasMore }
          : prev
      );
    } catch (err) {
      setChatError(err instanceof Error ? err.message : t("wa.loadFailed"));
    }
  }

  /** Catch-up after a reconnect or on the fallback timer: the list, and the open chat's latest page. */
  const resync = useCallback(async () => {
    if (Date.now() - lastListLoad.current > 2000) void loadConversations();
    const id = selectedRef.current;
    if (!id) return;
    try {
      const data = await fetchChat(id);
      if (!data || selectedRef.current !== id) return;
      setChat((prev) => {
        if (!prev || prev.conversation.id !== id) return prev;
        const merged = new Map(prev.messages.map((message) => [message.id, message]));
        data.messages.forEach((message) => merged.set(message.id, message));
        return { ...prev, conversation: data.conversation, messages: [...merged.values()].sort(byTime) };
      });
      if (data.conversation.unreadCount > 0 && visible()) void markRead(id);
    } catch {
      // the next resync tries again
    }
  }, [fetchChat, loadConversations, markRead]);

  // ---- realtime
  const onMessage = useCallback(
    (raw: unknown) => {
      const { conversation, message } = (raw ?? {}) as Partial<MessagePayload>;
      if (!conversation?.id || !message?.id) return;
      const isOpen = selectedRef.current === conversation.id;
      // Reading it right now: don't flash an unread badge we're about to clear.
      upsertConversation(isOpen && visible() ? { ...conversation, unreadCount: 0 } : conversation);
      if (!isOpen) return;
      setChat((prev) =>
        prev && prev.conversation.id === conversation.id && !prev.messages.some((known) => known.id === message.id)
          ? { ...prev, messages: [...prev.messages, message].sort(byTime) }
          : prev
      );
      if (message.direction === "inbound" && visible()) void markRead(conversation.id);
    },
    [markRead, upsertConversation]
  );

  const onStatus = useCallback((raw: unknown) => {
    const update = (raw ?? {}) as Partial<StatusPayload>;
    if (!update.conversationId || !update.messageId || !update.status) return;
    setChat((prev) =>
      prev && prev.conversation.id === update.conversationId
        ? { ...prev, messages: prev.messages.map((message) => (message.id === update.messageId ? { ...message, status: update.status!, error: update.error } : message)) }
        : prev
    );
  }, []);

  const onConversation = useCallback(
    (raw: unknown) => {
      const { conversation } = (raw ?? {}) as { conversation?: WhatsAppConversationDTO };
      if (conversation?.id) upsertConversation(conversation);
    },
    [upsertConversation]
  );

  const handlers = useMemo(
    () => ({
      [WHATSAPP_EVENTS.MESSAGE_NEW]: onMessage,
      [WHATSAPP_EVENTS.MESSAGE_SENT]: onMessage,
      [WHATSAPP_EVENTS.MESSAGE_STATUS]: onStatus,
      [WHATSAPP_EVENTS.CONVERSATION_UPDATED]: onConversation,
    }),
    [onMessage, onStatus, onConversation]
  );

  // One restaurant's screen listens on its own channel; HQ's list listens on
  // every restaurant's, all over the one shared connection.
  const hqChannels = useMemo(() => (hq ? restaurantIds.map(whatsAppChannel) : []), [hq, restaurantIds]);
  const own = useRealtime(handlers, resync, whatsAppChannel, hq ? null : undefined);
  const across = useRealtimeChannels(hqChannels, handlers, resync);
  const realtimeState = hq ? across.state : own.state;

  // First load, and the search box (debounced).
  useEffect(() => {
    queryRef.current = query.trim();
    const handle = setTimeout(() => void loadConversations(), query ? 300 : 0);
    return () => clearTimeout(handle);
  }, [query, loadConversations]);

  // Fallback: poll without Pusher, a quiet resync with it; both only on screen.
  usePeriodicRefresh(resync, realtimeState === "connected" ? SAFETY_RESYNC_MS : POLL_MS);

  // ---- send
  /** One POST for every kind of reply; the body shape is what differs. */
  const post = useCallback(
    async (body: Record<string, unknown>): Promise<boolean> => {
      setSending(true);
      setSendError(null);
      try {
        const res = await fetch(api.send(), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (redirectToLoginIfUnauthorized(res)) return false;
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? t("wa.err.sendFailed"));
        onMessage(data);
        return true;
      } catch (err) {
        setSendError(err instanceof Error ? err.message : t("wa.err.sendFailed"));
        return false;
      } finally {
        setSending(false);
      }
    },
    [api, onMessage, t]
  );

  async function send(text: string): Promise<boolean> {
    if (!chat) return false;
    const id = chat.conversation.id;
    return hq
      ? post({ conversationId: id, kind: "text", message: text })
      : post({ conversationId: id, to: chat.conversation.waId, message: text });
  }

  /** HQ only: upload the photo to Meta first, then send the id it hands back. */
  async function sendPhoto(file: File, caption: string): Promise<boolean> {
    if (!chat) return false;
    setSending(true);
    setSendError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/hq/whatsapp/media", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "The photo didn't upload");
      setSending(false);
      return post({ conversationId: chat.conversation.id, kind: "image", mediaId: data.mediaId, ...(caption ? { caption } : {}) });
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "The photo didn't upload");
      setSending(false);
      return false;
    }
  }

  /** HQ only: the one kind of message WhatsApp delivers past the 24-hour window. */
  async function sendTemplate(name: string, language: string, params: string[], preview: string): Promise<boolean> {
    if (!chat) return false;
    return post({ conversationId: chat.conversation.id, kind: "template", name, language, params, preview });
  }

  function closeChat() {
    selectedRef.current = null;
    setSelectedId(null);
    setChat(null);
  }

  const selectedFromList = conversations.find((conversation) => conversation.id === selectedId);
  const openConversation = chat?.conversation ?? selectedFromList;

  return (
    <div
      className={cn(
        "flex flex-col bg-surface-muted",
        // The restaurant's own screen owns the whole viewport. Inside HQ it
        // sits under the panel header, so it takes what is left.
        hq ? "h-[calc(100dvh-190px)] min-h-[480px] overflow-hidden rounded-[18px] border border-border" : "h-dvh"
      )}
    >
      <header className="flex items-center gap-3 border-b border-border bg-surface px-[clamp(12px,2vw,24px)] py-3">
        {homeHref ? (
          <IconButton href={homeHref} label={t("wa.back")} size="md">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M19 12H5" />
              <path d="m11 6-6 6 6 6" />
            </svg>
          </IconButton>
        ) : null}
        <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 20.5 5 16a8.5 8.5 0 1 1 3 3Z" />
            <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2Z" />
          </svg>
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="text-[22px] font-extrabold leading-tight">{t("wa.title")}</h1>
          <span className="truncate text-[13px] text-text-muted">{t("wa.subtitle")}</span>
        </div>
        <RealtimeStatus state={realtimeState} />
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1360px] flex-1 md:p-4">
        <div className="flex min-h-0 flex-1 overflow-hidden bg-surface md:rounded-[18px] md:border md:border-border">
          <aside className={cn("min-h-0 w-full flex-col border-border md:flex md:w-[340px] md:border-r", selectedId ? "hidden" : "flex")}>
            <ConversationList
              conversations={conversations}
              loading={listLoading}
              error={listError}
              query={query}
              onQueryChange={setQuery}
              selectedId={selectedId}
              onSelect={(id) => void openChat(id)}
            />
          </aside>
          <section className={cn("min-h-0 flex-1 flex-col md:flex", selectedId ? "flex" : "hidden")}>
            {openConversation ? (
              <ChatPane
                conversation={openConversation}
                messages={chat?.messages ?? []}
                hasMore={chat?.hasMore ?? false}
                loading={chatLoading}
                error={chatError}
                canSend={canSend}
                sending={sending}
                sendError={sendError}
                onBack={closeChat}
                onLoadEarlier={() => void loadEarlier()}
                onSend={send}
                onSendPhoto={hq ? sendPhoto : undefined}
                onSendTemplate={hq ? sendTemplate : undefined}
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-[#efeae2] px-6 text-center">
                <p className="text-[15px] font-bold text-stone-700">{t("wa.pick")}</p>
                {!canSend ? <p className="max-w-sm text-sm text-text-muted">{t("wa.sendOff")}</p> : null}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
