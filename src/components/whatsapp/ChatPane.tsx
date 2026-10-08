"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { MessageKey } from "@/lib/i18n/messages";
import { formatClock } from "@/lib/utils/time";
import { formatWaNumber } from "@/lib/whatsapp/phone";
import { cn } from "@/components/ui/cn";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { TextArea } from "@/components/ui/TextField";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { LoadingState } from "@/components/ui/LoadingState";
import type { WhatsAppConversationDTO, WhatsAppMessageDTO, WhatsAppMessageStatus } from "@/types";
import { Avatar } from "./ConversationList";
import { dayLabel, sameDay } from "./format";

interface ChatPaneProps {
  conversation: WhatsAppConversationDTO;
  messages: WhatsAppMessageDTO[];
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  canSend: boolean;
  sending: boolean;
  sendError: string | null;
  onBack: () => void;
  onLoadEarlier: () => void;
  /** Resolves true when Meta accepted the message (the composer then clears). */
  onSend: (text: string) => Promise<boolean>;
}

const STATUS_LABEL: Record<WhatsAppMessageStatus, MessageKey> = {
  received: "wa.status.delivered",
  accepted: "wa.status.accepted",
  sent: "wa.status.sent",
  delivered: "wa.status.delivered",
  read: "wa.status.read",
  failed: "wa.status.failed",
};

/** WhatsApp-style ticks: clock while Meta has it, ✓ sent, ✓✓ delivered, blue ✓✓ read, ! failed. */
function Ticks({ status, label }: { status: WhatsAppMessageStatus; label: string }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, role: "img", "aria-label": label };
  if (status === "failed") {
    return (
      <svg {...common} className="text-danger">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6M12 16.5v.5" />
      </svg>
    );
  }
  if (status === "accepted") {
    return (
      <svg {...common} className="text-stone-400">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l2.5 1.5" />
      </svg>
    );
  }
  const double = status === "delivered" || status === "read";
  return (
    <svg {...common} className={status === "read" ? "text-sky-500" : "text-stone-400"}>
      {double ? <path d="m2 13 4 4 9-10M10 15.5l1.5 1.5 9-10" /> : <path d="m5 13 4 4 10-11" />}
    </svg>
  );
}

function Composer({ disabled, sending, onSend }: { disabled: boolean; sending: boolean; onSend: (text: string) => Promise<boolean> }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const ready = draft.trim().length > 0 && !disabled && !sending;

  async function submit() {
    if (!ready) return;
    if (await onSend(draft.trim())) setDraft("");
  }

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <TextArea
        aria-label={t("wa.placeholder")}
        placeholder={t("wa.placeholder")}
        rows={Math.min(5, Math.max(1, draft.split("\n").length))}
        maxLength={4096}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          // Enter sends, Shift+Enter is a new line (and never while an IME is composing).
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            void submit();
          }
        }}
        className="min-h-12 flex-1 bg-surface text-[15px]"
      />
      <Button type="submit" variant="success" size="lg" disabled={!ready} className="shrink-0">
        {sending ? t("wa.sending") : t("wa.send")}
      </Button>
    </form>
  );
}

export function ChatPane({ conversation, messages, hasMore, loading, error, canSend, sending, sendError, onBack, onLoadEarlier, onSend }: ChatPaneProps) {
  const { t, lang } = useI18n();
  const scroller = useRef<HTMLDivElement>(null);
  const lastId = messages[messages.length - 1]?.id;
  const [now, setNow] = useState(() => Date.now());

  // The reply window closes on its own; re-check every minute.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // New message at the bottom (or a freshly opened chat) → scroll down. Loading older ones keeps the place.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId, conversation.id]);

  const windowEnds = conversation.replyWindowEndsAt ? new Date(conversation.replyWindowEndsAt).getTime() : 0;
  const timeLeft = (ms: number) => (ms >= 60 * 60 * 1000 ? t("wa.hours", { n: Math.floor(ms / (60 * 60 * 1000)) }) : t("wa.minutes", { n: Math.max(1, Math.ceil(ms / 60000)) }));
  const windowOpen = windowEnds > now;
  const title = conversation.customerName || formatWaNumber(conversation.waId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2.5">
        <IconButton label={t("wa.backToChats")} onClick={onBack} className="md:hidden">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M19 12H5" />
            <path d="m11 6-6 6 6 6" />
          </svg>
        </IconButton>
        <Avatar name={conversation.customerName} waId={conversation.waId} size={40} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-base font-extrabold">{title}</span>
          <span className="truncate text-xs text-text-muted">{formatWaNumber(conversation.waId)}</span>
        </div>
        <span className="hidden sm:block">
          <Badge tone={windowOpen ? "green" : "stone"} size="sm">
            {windowOpen ? t("wa.windowOpen", { left: timeLeft(windowEnds - now) }) : t("wa.windowClosed")}
          </Badge>
        </span>
      </div>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#efeae2] px-3 py-3 sm:px-6">
        {loading && messages.length === 0 ? <LoadingState /> : null}
        {error ? <Alert className="mb-3">{error}</Alert> : null}
        {hasMore ? (
          <div className="mb-3 flex justify-center">
            <Button variant="secondary" size="sm" onClick={onLoadEarlier}>
              {t("wa.loadEarlier")}
            </Button>
          </div>
        ) : null}

        <ol className="flex flex-col gap-1.5">
          {messages.map((message, index) => {
            const outbound = message.direction === "outbound";
            const newDay = index === 0 || !sameDay(messages[index - 1].timestamp, message.timestamp);
            return (
              <Fragment key={message.id}>
                {newDay ? (
                  <li className="my-2 flex justify-center" aria-hidden>
                    <span className="rounded-lg bg-white/90 px-3 py-1 text-xs font-semibold text-stone-600 shadow-sm">{dayLabel(message.timestamp, lang, t)}</span>
                  </li>
                ) : null}
                <li className={cn("flex", outbound ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "flex max-w-[min(78%,560px)] flex-col gap-0.5 rounded-xl px-3 py-2 text-[15px] leading-snug shadow-sm",
                      outbound ? "rounded-tr-sm bg-[#d9fdd3]" : "rounded-tl-sm bg-white"
                    )}
                    title={message.sentBy ? t("wa.sentBy", { name: message.sentBy }) : undefined}
                  >
                    <span className="whitespace-pre-wrap break-words">{message.text}</span>
                    {message.status === "failed" ? (
                      <span className="text-xs font-semibold text-danger">{t("wa.failedReason", { reason: message.error?.title || message.error?.message || t("wa.status.failed") })}</span>
                    ) : null}
                    <span className="flex items-center justify-end gap-1 self-end text-[11px] text-stone-500">
                      {formatClock(message.timestamp, lang)}
                      {outbound ? <Ticks status={message.status} label={t(STATUS_LABEL[message.status])} /> : null}
                    </span>
                  </div>
                </li>
              </Fragment>
            );
          })}
        </ol>
      </div>

      <div className="flex flex-col gap-2 border-t border-border bg-surface p-3">
        {!canSend ? (
          <Alert tone="info">{t("wa.sendOff")}</Alert>
        ) : !windowOpen ? (
          <Alert tone="warning">
            <strong className="block">{t("wa.windowClosed")}</strong>
            {t("wa.windowClosedHint")}
          </Alert>
        ) : null}
        {sendError ? <Alert>{sendError}</Alert> : null}
        <Composer disabled={!canSend || !windowOpen} sending={sending} onSend={onSend} />
        {canSend && windowOpen ? <p className="hidden text-xs text-text-muted sm:block">{t("wa.enterHint")}</p> : null}
      </div>
    </div>
  );
}
