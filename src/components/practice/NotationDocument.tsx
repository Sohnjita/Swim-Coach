"use client";

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, Plus, Sparkles, X } from "lucide-react";
import type {
  Course,
  LineModifier,
  PracticeLine,
  RepGroupLine,
  RoundLine,
  ScoringConfig,
  SetType,
  Stroke,
  TextLine,
} from "@/lib/types";
import { formatLine, makeRepGroupLine, makeRoundLine, makeTextLine } from "@/lib/lineTree";
import { formatInterval, formatTime, parseInterval } from "@/lib/conversions";
import { formatDateLabel } from "@/lib/format";
import { projectRepTime, type RepHistoryEntry } from "@/lib/scoring";
import { cn } from "@/lib/cn";

/** Bundles what's needed for the line editor's on-demand time projection. Omit to hide it. */
export interface ProjectionContext {
  history: RepHistoryEntry[];
  config: ScoringConfig;
  course: Course;
  setType: SetType;
}

interface Row {
  id: string;
  depth: number;
  kind: "reps" | "text" | "round-open" | "round-close";
  line?: RepGroupLine | TextLine | RoundLine;
  text: string;
}

/** Flattens a line tree into (text, sourceLineId, depth) rows, one row per rendered text line. */
function flattenForDisplay(lines: PracticeLine[], depth = 0): Row[] {
  const rows: Row[] = [];
  for (const line of lines) {
    if (line.kind === "round") {
      rows.push({ id: line.id, depth, kind: "round-open", line, text: `${line.multiplier}x[` });
      rows.push(...flattenForDisplay(line.items, depth + 1));
      // "round-close" rows carry the round's own id, used to target
      // inline "add a line inside this round" insertion.
      rows.push({ id: line.id, depth, kind: "round-close", text: "]" });
    } else {
      rows.push({ id: line.id, depth, kind: line.kind, line, text: formatLine(line)[0] });
    }
  }
  return rows;
}

export function NotationDocument({
  lines,
  onDeleteLine,
  onUpdateLine,
  onAddLine,
  onMoveLine,
  onLogTime,
  projectionContext,
}: {
  lines: PracticeLine[];
  onDeleteLine?: (id: string) => void;
  onUpdateLine?: (id: string, next: PracticeLine) => void;
  /** Appends a new line. `parentRoundId` targets a round's items instead of the top level. */
  onAddLine?: (line: PracticeLine, parentRoundId?: string) => void;
  /** Reorders a line by `delta` positions within its own sibling list. */
  onMoveLine?: (id: string, delta: number) => void;
  /** Logs a new timed rep for this block, seeded from its last written line. */
  onLogTime?: () => void;
  /** Enables the "Project" time estimate in the reps-line editor. */
  projectionContext?: ProjectionContext;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const rows = flattenForDisplay(lines);

  return (
    <div className="font-mono text-[13px] leading-6 text-text-primary">
      {rows.length === 0 && !onAddLine && (
        <p className="text-sm text-text-tertiary">No lines yet.</p>
      )}
      {rows.map((row) => {
        const editable = Boolean(onUpdateLine) && row.line !== undefined;
        const isEditing = editable && editingId === row.id;
        return (
          <div key={`${row.id}-${row.kind}`}>
            <div style={{ paddingLeft: row.depth * 16 }}>
              {isEditing ? (
                <LineRowEditor
                  row={row}
                  projectionContext={projectionContext}
                  onCancel={() => setEditingId(null)}
                  onSave={(next) => {
                    onUpdateLine!(row.id, next);
                    setEditingId(null);
                  }}
                />
              ) : (
                <DraggableRow
                  onTap={() => editable && setEditingId(row.id)}
                  onMove={onMoveLine && row.kind !== "round-close" ? (delta) => onMoveLine(row.id, delta) : undefined}
                >
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-left",
                      editable && "rounded active:bg-bg-elevated-2",
                    )}
                  >
                    {row.text}
                  </span>
                  {onDeleteLine && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => onDeleteLine(row.id)}
                      className="p-1 text-text-tertiary opacity-60 active:opacity-100"
                    >
                      <X size={13} />
                    </button>
                  )}
                </DraggableRow>
              )}
            </div>
            {row.kind === "round-close" && onAddLine && (
              <AddLineRow
                depth={row.depth + 1}
                onAdd={(line) => onAddLine(line, row.id)}
                projectionContext={projectionContext}
              />
            )}
          </div>
        );
      })}
      {onAddLine && (
        <AddLineRow
          depth={0}
          onAdd={(line) => onAddLine(line)}
          onLogTime={onLogTime}
          projectionContext={projectionContext}
        />
      )}
    </div>
  );
}

const LONG_PRESS_MS = 450;
const DRAG_SLOP = 6;

interface DragState {
  startX: number;
  startY: number;
  thresholdY: number;
  rowHeight: number;
  moved: boolean;
  dragging: boolean;
  timer: ReturnType<typeof setTimeout> | null;
}

/**
 * A line row that's a plain tap when tapped, but — in edit mode, when
 * `onMove` is given — becomes draggable after a brief hold: the row lifts
 * and follows the finger, swapping with its neighbor each time it crosses
 * a row-height of movement. A quick tap (released before the hold
 * threshold, or a fast scroll gesture) never engages this at all, so
 * scrolling the page from on top of a line still works normally.
 */
function DraggableRow({
  onTap,
  onMove,
  children,
}: {
  onTap: () => void;
  onMove?: (delta: 1 | -1) => void;
  children: React.ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  const [offsetY, setOffsetY] = useState(0);
  const rowRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  function clearTimer() {
    if (dragRef.current?.timer) {
      clearTimeout(dragRef.current.timer);
      dragRef.current.timer = null;
    }
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (!onMove) return;
    const rowHeight = rowRef.current?.getBoundingClientRect().height ?? 24;
    const pointerId = e.pointerId;
    const target = e.currentTarget;
    const state: DragState = {
      startX: e.clientX,
      startY: e.clientY,
      thresholdY: e.clientY,
      rowHeight,
      moved: false,
      dragging: false,
      timer: null,
    };
    dragRef.current = state;
    state.timer = setTimeout(() => {
      if (!dragRef.current || dragRef.current.moved) return;
      dragRef.current.dragging = true;
      target.setPointerCapture(pointerId);
      setDragging(true);
    }, LONG_PRESS_MS);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const state = dragRef.current;
    if (!state) return;
    if (!state.dragging) {
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      if (Math.abs(dx) > DRAG_SLOP || Math.abs(dy) > DRAG_SLOP) {
        state.moved = true;
        clearTimer();
      }
      return;
    }
    const totalDy = e.clientY - state.thresholdY;
    setOffsetY(e.clientY - state.startY);
    if (totalDy > state.rowHeight) {
      onMove?.(1);
      state.thresholdY = e.clientY;
    } else if (totalDy < -state.rowHeight) {
      onMove?.(-1);
      state.thresholdY = e.clientY;
    }
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const state = dragRef.current;
    clearTimer();
    if (state?.dragging) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } else if (!state?.moved) {
      onTap();
    }
    dragRef.current = null;
    setDragging(false);
    setOffsetY(0);
  }

  return (
    <div
      ref={rowRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        transform: dragging ? `translateY(${offsetY}px)` : undefined,
        touchAction: dragging ? "none" : "pan-y",
      }}
      className={cn(
        "group flex items-center justify-between gap-1 py-0.5",
        dragging && "relative z-10 rounded bg-bg-elevated-2 shadow-lg",
      )}
    >
      {children}
    </div>
  );
}

type DraftKind = "reps" | "text" | "round";

/**
 * Inline "+" under the last line: offers Line / Note / Round, then opens
 * the matching draft editor and adds it as a new line in place — notes and
 * rounds are lines within the block being written, not separate blocks.
 */
function AddLineRow({
  depth,
  onAdd,
  onLogTime,
  projectionContext,
}: {
  depth: number;
  onAdd: (line: PracticeLine) => void;
  onLogTime?: () => void;
  projectionContext?: ProjectionContext;
}) {
  const [draftKind, setDraftKind] = useState<DraftKind | null>(null);

  if (draftKind === "reps") {
    const draft = makeRepGroupLine({});
    const row: Row = { id: draft.id, depth, kind: "reps", line: draft, text: "" };
    return (
      <div style={{ paddingLeft: depth * 16 }}>
        <LineRowEditor
          row={row}
          projectionContext={projectionContext}
          onCancel={() => setDraftKind(null)}
          onSave={(next) => {
            onAdd(next);
            setDraftKind(null);
          }}
        />
      </div>
    );
  }
  if (draftKind === "text") {
    const draft = makeTextLine("");
    const row: Row = { id: draft.id, depth, kind: "text", line: draft, text: "" };
    return (
      <div style={{ paddingLeft: depth * 16 }}>
        <LineRowEditor
          row={row}
          onCancel={() => setDraftKind(null)}
          onSave={(next) => {
            onAdd(next);
            setDraftKind(null);
          }}
        />
      </div>
    );
  }
  if (draftKind === "round") {
    const draft = makeRoundLine(2);
    const row: Row = { id: draft.id, depth, kind: "round-open", line: draft, text: "" };
    return (
      <div style={{ paddingLeft: depth * 16 }}>
        <LineRowEditor
          row={row}
          onCancel={() => setDraftKind(null)}
          onSave={(next) => {
            onAdd(next);
            setDraftKind(null);
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <div className="py-1">
        <button
          type="button"
          onClick={() => setDraftKind("reps")}
          aria-label="Add line"
          className="rounded-lg border border-dashed border-border p-1 text-text-tertiary active:opacity-70"
        >
          <Plus size={12} />
        </button>
      </div>
      <div className="flex items-center gap-1 pb-1">
        <button
          type="button"
          onClick={() => setDraftKind("text")}
          className="rounded-lg border border-dashed border-border px-1.5 py-1 text-[11px] text-text-tertiary active:opacity-70"
        >
          Note
        </button>
        <button
          type="button"
          onClick={() => setDraftKind("round")}
          className="rounded-lg border border-dashed border-border px-1.5 py-1 text-[11px] text-text-tertiary active:opacity-70"
        >
          Round
        </button>
        {onLogTime && (
          <button
            type="button"
            onClick={onLogTime}
            className="rounded-lg border border-dashed border-border px-1.5 py-1 text-[11px] text-text-tertiary active:opacity-70"
          >
            Log time
          </button>
        )}
      </div>
    </div>
  );
}

const STROKES: { label: string; value: Stroke | null }[] = [
  { label: "Mixed", value: null },
  { label: "Free", value: "free" },
  { label: "Back", value: "back" },
  { label: "Breast", value: "breast" },
  { label: "Fly", value: "fly" },
  { label: "IM", value: "im" },
];

const MODIFIERS: { label: string; value: LineModifier }[] = [
  { label: "Swim", value: "swim" },
  { label: "Kick", value: "kick" },
  { label: "Drill", value: "drill" },
  { label: "Pull", value: "pull" },
];

const DESCRIPTORS = ["Build", "Descend", "Race", "Best avg", "Easy"] as const;

/** "Descend" carries the current rep count, e.g. "descend 1-4". */
function descriptorTag(label: (typeof DESCRIPTORS)[number], count: number): string {
  return label === "Descend" ? `descend 1-${count}` : label.toLowerCase();
}

function EditorChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-2 py-0.5 text-xs whitespace-nowrap",
        active
          ? "bg-accent text-accent-text font-medium"
          : "border border-border bg-bg-elevated text-text-secondary",
      )}
    >
      {children}
    </button>
  );
}

function EditorActions({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-1">
      <button type="button" onClick={onCancel} className="p-1.5 text-text-tertiary active:opacity-70">
        <X size={15} />
      </button>
      <button type="button" onClick={onSave} className="p-1.5 text-accent active:opacity-70">
        <Check size={15} />
      </button>
    </div>
  );
}

function LineRowEditor({
  row,
  onSave,
  onCancel,
  projectionContext,
}: {
  row: Row;
  onSave: (next: PracticeLine) => void;
  onCancel: () => void;
  projectionContext?: ProjectionContext;
}) {
  if (row.kind === "round-open") {
    return <RoundLineEditor round={row.line as RoundLine} onSave={onSave} onCancel={onCancel} />;
  }
  if (row.kind === "text") {
    return <TextLineEditor line={row.line as TextLine} onSave={onSave} onCancel={onCancel} />;
  }
  return (
    <RepLineEditor
      line={row.line as RepGroupLine}
      onSave={onSave}
      onCancel={onCancel}
      projectionContext={projectionContext}
    />
  );
}

function RoundLineEditor({
  round,
  onSave,
  onCancel,
}: {
  round: RoundLine;
  onSave: (next: PracticeLine) => void;
  onCancel: () => void;
}) {
  const [multiplierText, setMultiplierText] = useState(String(round.multiplier));
  return (
    <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-bg-elevated-2 px-2 py-1">
      <span className="text-xs text-text-tertiary">Repeat</span>
      <input
        inputMode="numeric"
        autoFocus
        value={multiplierText}
        onChange={(e) => setMultiplierText(e.target.value)}
        className="h-8 w-14 rounded-lg border border-border bg-bg-elevated text-center text-sm text-text-primary outline-none focus:border-accent"
      />
      <span className="text-xs text-text-tertiary">x[</span>
      <div className="flex-1" />
      <EditorActions
        onSave={() => onSave({ ...round, multiplier: Math.max(1, Number(multiplierText) || 1) })}
        onCancel={onCancel}
      />
    </div>
  );
}

function TextLineEditor({
  line,
  onSave,
  onCancel,
}: {
  line: TextLine;
  onSave: (next: PracticeLine) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(line.text);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-bg-elevated-2 px-2 py-1">
      <input
        value={value}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-bg-elevated px-2 text-sm text-text-primary outline-none focus:border-accent"
      />
      <EditorActions
        onSave={() => onSave({ ...line, text: value.trim() || line.text })}
        onCancel={onCancel}
      />
    </div>
  );
}

function RepLineEditor({
  line,
  onSave,
  onCancel,
  projectionContext,
}: {
  line: RepGroupLine;
  onSave: (next: PracticeLine) => void;
  onCancel: () => void;
  projectionContext?: ProjectionContext;
}) {
  const [countText, setCountText] = useState(String(line.count));
  const [distanceText, setDistanceText] = useState(String(line.distance));
  const [intervalText, setIntervalText] = useState(
    line.intervalSeconds === null ? "" : formatInterval(line.intervalSeconds),
  );
  const [stroke, setStroke] = useState<Stroke | null>(line.stroke ?? null);
  const [modifier, setModifier] = useState<LineModifier>(line.modifier);
  const [tag, setTag] = useState(line.tag ?? "");
  const [projection, setProjection] = useState<ReturnType<typeof projectRepTime> | "idle">("idle");

  const count = Math.max(0, Number(countText) || 0);

  function requestProjection() {
    if (!projectionContext) return;
    setProjection(
      projectRepTime(
        {
          distance: Math.max(0, Number(distanceText) || 0),
          stroke: stroke ?? "free",
          course: projectionContext.course,
          setType: projectionContext.setType,
          intervalSeconds: parseInterval(intervalText),
        },
        projectionContext.history,
        projectionContext.config,
      ),
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-accent/40 bg-bg-elevated-2 p-2">
      <div className="flex items-center gap-1">
        <input
          inputMode="numeric"
          autoFocus
          value={countText}
          onChange={(e) => setCountText(e.target.value)}
          className="h-8 w-10 rounded-lg border border-border bg-bg-elevated text-center text-sm text-text-primary outline-none focus:border-accent"
        />
        <span className="text-text-tertiary">x</span>
        <input
          inputMode="numeric"
          value={distanceText}
          onChange={(e) => setDistanceText(e.target.value)}
          className="h-8 w-14 rounded-lg border border-border bg-bg-elevated text-center text-sm text-text-primary outline-none focus:border-accent"
        />
        <span className="text-xs text-text-tertiary">on</span>
        <input
          value={intervalText}
          onChange={(e) => setIntervalText(e.target.value)}
          placeholder="1:30"
          className="h-8 w-14 rounded-lg border border-border bg-bg-elevated text-center text-sm text-text-primary outline-none focus:border-accent"
        />
        <input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="tag"
          className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-bg-elevated px-2 text-sm text-text-primary outline-none focus:border-accent"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {STROKES.map((s) => (
          <EditorChip key={s.value} active={stroke === s.value} onClick={() => setStroke(s.value)}>
            {s.label}
          </EditorChip>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {MODIFIERS.map((m) => (
          <EditorChip key={m.value} active={modifier === m.value} onClick={() => setModifier(m.value)}>
            {m.label}
          </EditorChip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {DESCRIPTORS.map((label) => {
          const value = descriptorTag(label, count);
          const active = label === "Descend" ? tag.startsWith("descend 1-") : tag === value;
          return (
            <EditorChip key={label} active={active} onClick={() => setTag(active ? "" : value)}>
              {label}
            </EditorChip>
          );
        })}
        <div className="flex-1" />
        <EditorActions
          onSave={() =>
            onSave({
              ...line,
              count,
              distance: Math.max(0, Number(distanceText) || 0),
              intervalSeconds: parseInterval(intervalText),
              stroke: stroke ?? undefined,
              modifier,
              tag: tag.trim() || undefined,
            })
          }
          onCancel={onCancel}
        />
      </div>
      {projectionContext && (
        <div className="border-t border-border/40 pt-2">
          {projection === "idle" ? (
            <button
              type="button"
              onClick={requestProjection}
              className="flex items-center gap-1 text-xs text-accent active:opacity-70"
            >
              <Sparkles size={11} /> Project time
            </button>
          ) : projection.sampleCount === 0 ? (
            <p className="text-xs text-text-tertiary">No similar reps logged yet.</p>
          ) : (
            <p className="text-xs text-text-tertiary">
              <span className="tabular-nums text-text-secondary">
                ~{formatTime(projection.projectedSeconds)}
              </span>{" "}
              · {projection.sampleCount} similar rep{projection.sampleCount === 1 ? "" : "s"}
              {projection.mostRecentDate && `, most recent ${formatDateLabel(projection.mostRecentDate)}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
