"use client";

import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Trash2 } from "lucide-react";

const REVEAL_WIDTH = 72;
const DRAG_SLOP = 4; // px of movement before a pointer-down counts as a drag, not a tap

interface DragState {
  startX: number;
  startOffset: number;
  moved: boolean;
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
    dragRef.current = { startX: e.clientX, startOffset: offset, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > DRAG_SLOP) drag.moved = true;
    if (!drag.moved) return;
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
    setOffset((cur) => (cur < -REVEAL_WIDTH / 2 ? -REVEAL_WIDTH : 0));
  }

  return (
    <div className="relative overflow-hidden">
      <button
        type="button"
        onClick={() => {
          onDelete();
          setOffset(0);
        }}
        aria-label="Delete practice"
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-danger/20 text-danger active:bg-danger/30"
        style={{ width: REVEAL_WIDTH }}
      >
        <Trash2 size={18} />
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative bg-bg"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 0.2s ease",
          touchAction: "pan-y",
        }}
      >
        {children}
      </div>
    </div>
  );
}
