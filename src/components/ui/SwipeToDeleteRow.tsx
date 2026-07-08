"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Trash2 } from "lucide-react";

const REVEAL_WIDTH = 72;
const DRAG_SLOP = 4; // px of movement before a pointer-down counts as a drag, not a tap

interface DragState {
  startX: number;
  startY: number;
  startOffset: number;
  moved: boolean;
  horizontal: boolean;
}

/** A list row that can be swiped left to reveal a delete action, iOS-Mail style. */
export function SwipeToDeleteRow({
  onDelete,
  onClick,
  children,
}: {
  onDelete: () => void;
  onClick: () => void;
  children: ReactNode;
}) {
  const [offset, setOffset] = useState(0); // 0 = closed, -REVEAL_WIDTH = open
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<DragState | null>(null);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffset: offset,
      moved: false,
      horizontal: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && (Math.abs(dx) > DRAG_SLOP || Math.abs(dy) > DRAG_SLOP)) {
      drag.moved = true;
      // Only a horizontal-dominant gesture is a swipe attempt — a vertical
      // one is a scroll, and must not snap the reveal open or get treated
      // as a tap on release (both of which fought the page's own scrolling).
      drag.horizontal = Math.abs(dx) > Math.abs(dy);
    }
    if (!drag.moved || !drag.horizontal) return;
    setOffset(Math.min(0, Math.max(-REVEAL_WIDTH, drag.startOffset + dx)));
  }

  function onPointerUp() {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (!drag) return;
    if (!drag.moved) {
      // A clean tap: close if it was open, otherwise treat as activating the row.
      if (offset !== 0) setOffset(0);
      else onClick();
      return;
    }
    if (!drag.horizontal) return; // vertical scroll — leave it to the page
    setOffset((cur) => (cur < -REVEAL_WIDTH / 2 ? -REVEAL_WIDTH : 0));
  }

  const transition = dragging ? "none" : "transform 0.2s ease";

  return (
    <div className="relative overflow-hidden">
      {/*
        Rests just past the right edge (left: 100%) rather than "underneath"
        the row at right: 0 — so at offset 0 it's genuinely outside the
        clipped area, not just painted over. That way the row itself needs
        no background of its own to mask it, and the page's water gradient/
        lane lines keep showing through the row exactly as everywhere else.
        Sharing the same transform keeps it flush against the row's trailing
        edge at every point in the drag, not just fully open.
      */}
      <button
        type="button"
        onClick={() => {
          onDelete();
          setOffset(0);
        }}
        aria-label="Delete practice"
        className="absolute inset-y-0 flex items-center justify-center text-danger active:opacity-70"
        style={{ left: "100%", width: REVEAL_WIDTH, transform: `translateX(${offset}px)`, transition }}
      >
        <Trash2 size={18} />
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative"
        style={{ transform: `translateX(${offset}px)`, transition, touchAction: "pan-y" }}
      >
        {children}
      </div>
    </div>
  );
}
