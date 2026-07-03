"use client";

import { useState } from "react";
import { Brackets, Check, Plus, Type, X } from "lucide-react";
import type { LineModifier, PracticeLine, RepGroupLine, RoundLine, Stroke, TextLine } from "@/lib/types";
import { formatLine, makeRepGroupLine, makeRoundLine, makeTextLine } from "@/lib/lineTree";
import { formatInterval, parseInterval } from "@/lib/conversions";
import { cn } from "@/lib/cn";

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
}: {
  lines: PracticeLine[];
  onDeleteLine?: (id: string) => void;
  onUpdateLine?: (id: string, next: PracticeLine) => void;
  /** Appends a new line. `parentRoundId` targets a round's items instead of the top level. */
  onAddLine?: (line: PracticeLine, parentRoundId?: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const rows = flattenForDisplay(lines);

  return (
    <div className="font-mono text-[13px] leading-6 text-text-primary">
      {rows.length === 0 && !onAddLine && (
        <p className="text-sm text-text-tertiary">No lines yet.</p>
      )}
      {rows.map((row, i) => {
        const editable = Boolean(onUpdateLine) && row.line !== undefined;
        const isEditing = editable && editingId === row.id;
        return (
          <div key={`${row.id}-${i}`}>
            <div style={{ paddingLeft: row.depth * 16 }}>
              {isEditing ? (
                <LineRowEditor
                  row={row}
                  onCancel={() => setEditingId(null)}
                  onSave={(next) => {
                    onUpdateLine!(row.id, next);
                    setEditingId(null);
                  }}
                />
              ) : (
                <div className="group flex items-center justify-between gap-1 py-0.5">
                  <button
                    type="button"
                    disabled={!editable}
                    onClick={() => editable && setEditingId(row.id)}
                    className={cn(
                      "min-w-0 flex-1 truncate text-left",
                      editable && "rounded active:bg-bg-elevated-2",
                    )}
                  >
                    {row.text}
                  </button>
                  {onDeleteLine && (
                    <button
                      type="button"
                      onClick={() => onDeleteLine(row.id)}
                      className="p-1 text-text-tertiary opacity-60 active:opacity-100"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              )}
            </div>
            {row.kind === "round-close" && onAddLine && (
              <AddLineRow
                depth={row.depth + 1}
                allowRound={false}
                onAdd={(line) => onAddLine(line, row.id)}
              />
            )}
          </div>
        );
      })}
      {onAddLine && <AddLineRow depth={0} allowRound onAdd={(line) => onAddLine(line)} />}
    </div>
  );
}

/** Inline "+" bar: tap to pick a line kind, then edit it in place before it's added. */
function AddLineRow({
  depth,
  allowRound,
  onAdd,
}: {
  depth: number;
  allowRound: boolean;
  onAdd: (line: PracticeLine) => void;
}) {
  const [draft, setDraft] = useState<PracticeLine | null>(null);

  if (draft) {
    const row: Row =
      draft.kind === "round"
        ? { id: draft.id, depth, kind: "round-open", line: draft, text: "" }
        : { id: draft.id, depth, kind: draft.kind, line: draft, text: "" };
    return (
      <div style={{ paddingLeft: depth * 16 }}>
        <LineRowEditor
          row={row}
          onCancel={() => setDraft(null)}
          onSave={(next) => {
            onAdd(next);
            setDraft(null);
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: depth * 16 }} className="flex items-center gap-1.5 py-1">
      <button
        type="button"
        onClick={() => setDraft(makeRepGroupLine({}))}
        className="flex items-center gap-1 rounded-lg border border-dashed border-border px-2 py-1 text-xs text-text-tertiary active:opacity-70"
      >
        <Plus size={12} /> Set
      </button>
      <button
        type="button"
        onClick={() => setDraft(makeTextLine(""))}
        className="flex items-center gap-1 rounded-lg border border-dashed border-border px-2 py-1 text-xs text-text-tertiary active:opacity-70"
      >
        <Type size={12} /> Note
      </button>
      {allowRound && (
        <button
          type="button"
          onClick={() => setDraft(makeRoundLine(2))}
          className="flex items-center gap-1 rounded-lg border border-dashed border-border px-2 py-1 text-xs text-text-tertiary active:opacity-70"
        >
          <Brackets size={12} /> Round
        </button>
      )}
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
}: {
  row: Row;
  onSave: (next: PracticeLine) => void;
  onCancel: () => void;
}) {
  if (row.kind === "round-open") {
    return <RoundLineEditor round={row.line as RoundLine} onSave={onSave} onCancel={onCancel} />;
  }
  if (row.kind === "text") {
    return <TextLineEditor line={row.line as TextLine} onSave={onSave} onCancel={onCancel} />;
  }
  return <RepLineEditor line={row.line as RepGroupLine} onSave={onSave} onCancel={onCancel} />;
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
  const [multiplier, setMultiplier] = useState(round.multiplier);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-bg-elevated-2 px-2 py-1">
      <span className="text-xs text-text-tertiary">Repeat</span>
      <input
        inputMode="numeric"
        autoFocus
        value={multiplier}
        onChange={(e) => setMultiplier(Number(e.target.value) || 1)}
        className="h-8 w-14 rounded-lg border border-border bg-bg-elevated text-center text-sm text-text-primary outline-none focus:border-accent"
      />
      <span className="text-xs text-text-tertiary">x[</span>
      <div className="flex-1" />
      <EditorActions onSave={() => onSave({ ...round, multiplier })} onCancel={onCancel} />
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
}: {
  line: RepGroupLine;
  onSave: (next: PracticeLine) => void;
  onCancel: () => void;
}) {
  const [count, setCount] = useState(line.count);
  const [distance, setDistance] = useState(line.distance);
  const [intervalText, setIntervalText] = useState(formatInterval(line.intervalSeconds));
  const [stroke, setStroke] = useState<Stroke | null>(line.stroke ?? null);
  const [modifier, setModifier] = useState<LineModifier>(line.modifier);
  const [tag, setTag] = useState(line.tag ?? "");

  return (
    <div className="space-y-2 rounded-xl border border-accent/40 bg-bg-elevated-2 p-2">
      <div className="flex items-center gap-1">
        <input
          inputMode="numeric"
          autoFocus
          value={count}
          onChange={(e) => setCount(Number(e.target.value) || 0)}
          className="h-8 w-10 rounded-lg border border-border bg-bg-elevated text-center text-sm text-text-primary outline-none focus:border-accent"
        />
        <span className="text-text-tertiary">x</span>
        <input
          inputMode="numeric"
          value={distance}
          onChange={(e) => setDistance(Number(e.target.value) || 0)}
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
      <div className="flex flex-wrap items-center gap-1">
        {MODIFIERS.map((m) => (
          <EditorChip key={m.value} active={modifier === m.value} onClick={() => setModifier(m.value)}>
            {m.label}
          </EditorChip>
        ))}
        <div className="flex-1" />
        <EditorActions
          onSave={() =>
            onSave({
              ...line,
              count,
              distance,
              intervalSeconds: parseInterval(intervalText),
              stroke: stroke ?? undefined,
              modifier,
              tag: tag.trim() || undefined,
            })
          }
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}
