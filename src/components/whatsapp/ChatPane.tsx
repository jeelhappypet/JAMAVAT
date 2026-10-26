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
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
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
  /** HQ only: send a photo. Absent on a restaurant's own screen. */
  onSendPhoto?: (file: File, caption: string) => Promise<boolean>;
  /** HQ only: send an approved template — the only thing that reopens a closed window. */
  onSendTemplate?: (name: string, language: string, params: string[], preview: string) => Promise<boolean>;
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

function Composer({
  disabled,
  sending,
  onSend,
  onSendPhoto,
}: {
  disabled: boolean;
  sending: boolean;
  onSend: (text: string) => Promise<boolean>;
  onSendPhoto?: (file: File, caption: string) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const ready = (draft.trim().length > 0 || Boolean(photo)) && !disabled && !sending;

  async function submit() {
    if (!ready) return;
    // A photo carries the typed text as its caption, so one send covers both.
    const done = photo && onSendPhoto ? await onSendPhoto(photo, draft.trim()) : await onSend(draft.trim());
    if (!done) return;
    setDraft("");
    setPhoto(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {onSendPhoto ? (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          />
          <IconButton label={photo ? `Photo: ${photo.name}` : "Attach a photo"} size="md" onClick={() => fileRef.current?.click()} disabled={disabled}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </IconButton>
        </>
      ) : null}
      <TextArea
        aria-label={t("wa.placeholder")}
        placeholder={photo ? "Caption (optional)" : t("wa.placeholder")}
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

interface TemplateSummary {
  name: string;
  language: string;
  status: string;
  body: string;
  params: number;
}

/** `{{1}}` … replaced by what was typed, so the preview is what the customer will read. */
function fill(body: string, values: string[]): string {
  return values.reduce((text, value, index) => text.replaceAll(`{{${index + 1}}}`, value || `{{${index + 1}}}`), body);
}

/**
 * The approved templates, to reopen a chat whose 24-hour window has closed.
 * Only approved ones can be sent — the rest are listed greyed out so it is
 * clear something is waiting on Meta rather than missing.
 */
function TemplatePicker({
  open,
  sending,
  onClose,
  onSend,
}: {
  open: boolean;
  sending: boolean;
  onClose: () => void;
  onSend: (name: string, language: string, params: string[], preview: string) => Promise<boolean>;
}) {
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null);
  const [picked, setPicked] = useState<TemplateSummary | null>(null);
  const [values, setValues] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || templates) return;
    void (async () => {
      try {
        const res = await fetch("/api/hq/whatsapp/templates");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Couldn't load the templates");
        setTemplates(data.templates);
        setError(data.error ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load the templates");
        setTemplates([]);
      }
    })();
  }, [open, templates]);

  function choose(template: TemplateSummary) {
    setPicked(template);
    setValues(Array.from({ length: template.params }, () => ""));
  }

  async function submit() {
    if (!picked) return;
    if (await onSend(picked.name, picked.language, values, fill(picked.body, values))) {
      setPicked(null);
      setValues([]);
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      title="Send a template"
      onClose={onClose}
      footer={
        picked ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => setPicked(null)}>
              Back
            </Button>
            <Button variant="success" size="sm" onClick={() => void submit()} disabled={sending || values.some((value) => !value.trim())}>
              {sending ? "Sending…" : "Send"}
            </Button>
          </>
        ) : null
      }
    >
      {error ? <Alert>{error}</Alert> : null}
      {templates === null ? (
        <LoadingState />
      ) : picked ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-extrabold">
            {picked.name} <span className="font-semibold text-text-muted">· {picked.language}</span>
          </p>
          {values.map((value, index) => (
            <TextField
              key={index}
              label={`{{${index + 1}}}`}
              value={value}
              onChange={(e) => setValues((prev) => prev.map((old, at) => (at === index ? e.target.value : old)))}
            />
          ))}
          <div>
            <p className="mb-1 text-xs font-bold text-text-muted">What they will read</p>
            <pre className="whitespace-pre-wrap break-words rounded-[12px] bg-[#d9fdd3] p-3 font-sans text-[14px] leading-relaxed">{fill(picked.body, values)}</pre>
          </div>
        </div>
      ) : templates.length === 0 ? (
        <p className="text-sm text-text-muted">No templates on this WhatsApp account yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {templates.map((template) => {
            const approved = template.status === "APPROVED";
            return (
              <li key={`${template.name}-${template.language}`}>
                <button
                  type="button"
                  disabled={!approved}
                  onClick={() => choose(template)}
                  className={cn(
                    "w-full rounded-[12px] border border-border p-3 text-left",
                    approved ? "bg-surface hover:border-stone-300" : "cursor-not-allowed bg-surface-muted opacity-60"
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold">
                      {template.name} <span className="font-semibold text-text-muted">· {template.language}</span>
                    </span>
                    <Badge tone={approved ? "green" : "orange"} size="sm">
                      {template.status}
                    </Badge>
                  </span>
                  <span className="mt-1 block line-clamp-2 text-xs text-text-muted">{template.body}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

export function ChatPane({ conversation, messages, hasMore, loading, error, canSend, sending, sendError, onBack, onLoadEarlier, onSend, onSendPhoto, onSendTemplate }: ChatPaneProps) {
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
  const [templateOpen, setTemplateOpen] = useState(false);
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
          <span className="truncate text-xs text-text-muted">
            {formatWaNumber(conversation.waId)}
            {conversation.restaurantName ? ` · ${conversation.restaurantName}` : ""}
          </span>
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
        {onSendTemplate ? (
          <div className="mb-2 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setTemplateOpen(true)} disabled={!canSend}>
              Template
            </Button>
            {!windowOpen ? <span className="text-xs text-text-muted">The 24-hour window is closed — a template is the only thing that gets through.</span> : null}
          </div>
        ) : null}
        <Composer disabled={!canSend || !windowOpen} sending={sending} onSend={onSend} onSendPhoto={onSendPhoto} />
        {onSendTemplate ? <TemplatePicker open={templateOpen} sending={sending} onClose={() => setTemplateOpen(false)} onSend={onSendTemplate} /> : null}
        {canSend && windowOpen ? <p className="hidden text-xs text-text-muted sm:block">{t("wa.enterHint")}</p> : null}
      </div>
    </div>
  );
}
