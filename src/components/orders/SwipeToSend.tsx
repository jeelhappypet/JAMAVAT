"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

const THUMB_SIZE = 56;
const EDGE_GAP = 8;

interface SwipeToSendProps {
  label?: string;
  sendingLabel?: string;
  disabled?: boolean;
  onComplete: () => Promise<void> | void;
}

export function SwipeToSend({
  label = "ઓર્ડર મોકલવા સ્વાઇપ કરો",
  sendingLabel = "મોકલી રહ્યા છીએ…",
  disabled = false,
  onComplete,
}: SwipeToSendProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const maxDragRef = useRef(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);

  const locked = disabled || sending;

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (locked) return;
    const track = trackRef.current;
    if (!track) return;
    maxDragRef.current = Math.max(track.clientWidth - THUMB_SIZE - EDGE_GAP, 0);
    startXRef.current = e.clientX - dragX;
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Some browsers/devices reject capture for this pointer id — dragging
      // still works via the move/up listeners already bound on the thumb.
    }
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const next = Math.min(Math.max(0, e.clientX - startXRef.current), maxDragRef.current);
    setDragX(next);
  }

  async function handlePointerUp() {
    if (!dragging) return;
    setDragging(false);

    const threshold = maxDragRef.current * 0.85;
    if (maxDragRef.current > 0 && dragX >= threshold) {
      setDragX(maxDragRef.current);
      setSending(true);
      try {
        await onComplete();
      } catch {
        setSending(false);
        setDragX(0);
      }
    } else {
      setDragX(0);
    }
  }

  return (
    <div
      ref={trackRef}
      className={`relative h-16 w-full select-none overflow-hidden rounded-full border border-border bg-surface-muted ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-brand-light"
        style={{ width: dragX + THUMB_SIZE }}
        aria-hidden
      />

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-16 text-center text-base font-semibold text-text-muted">
        {sending ? sendingLabel : label}
      </div>

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        role="button"
        aria-label={label}
        className="absolute left-1 top-1 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-md touch-none"
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? "none" : "transform 0.2s ease-out",
          cursor: locked ? "default" : "grab",
        }}
      >
        {sending ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        )}
      </div>
    </div>
  );
}
