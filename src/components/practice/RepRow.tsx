"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { Rep, StartType, Stroke, SuitType } from "@/lib/types";
import { formatTime, parseTime } from "@/lib/conversions";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Field";

const STROKES: { label: string; value: Stroke }[] = [
  { label: "Free", value: "free" },
  { label: "Back", value: "back" },
  { label: "Breast", value: "breast" },
  { label: "Fly", value: "fly" },
  { label: "IM", value: "im" },
  { label: "Kick", value: "kick" },
  { label: "Drill", value: "drill" },
];

export function RepRow({
  rep,
  score,
  onChange,
  onRemove,
}: {
  rep: Rep;
  score?: number | null;
  onChange: (rep: Rep) => void;
  onRemove?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [timeText, setTimeText] = useState(rep.time !== null ? formatTime(rep.time) : "");

  return (
    <div className="rounded-xl border border-border bg-bg-elevated-2/60">
      <div className="flex items-center gap-2 p-2">
        <span className="w-6 shrink-0 text-center text-xs text-text-tertiary">
          {rep.repIndex}
        </span>
        <input
          placeholder="mm:ss.ff"
          value={timeText}
          onChange={(e) => setTimeText(e.target.value)}
          onBlur={() => onChange({ ...rep, time: parseTime(timeText) })}
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-bg-elevated px-2 text-[15px] tabular-nums text-text-primary outline-none focus:border-accent"
        />
        <input
          inputMode="numeric"
          placeholder="strk"
          value={rep.strokeCount ?? ""}
          onChange={(e) =>
            onChange({
              ...rep,
              strokeCount: e.target.value === "" ? null : Number(e.target.value),
            })
          }
          className="h-9 w-14 shrink-0 rounded-lg border border-border bg-bg-elevated px-2 text-center text-[13px] tabular-nums text-text-primary outline-none focus:border-accent"
        />
        {score !== undefined && (
          <span className="w-8 shrink-0 text-right text-xs text-text-tertiary">
            {score !== null ? Math.round(score) : "--"}
          </span>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 p-1 text-text-tertiary"
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 p-1 text-text-tertiary"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {expanded && (
        <div className="grid grid-cols-2 gap-2 border-t border-border p-2">
          <label className="text-xs text-text-tertiary">
            Distance
            <input
              inputMode="numeric"
              value={rep.distance}
              onChange={(e) =>
                onChange({ ...rep, distance: Number(e.target.value) || 0 })
              }
              className="mt-1 h-9 w-full rounded-lg border border-border bg-bg-elevated px-2 text-[13px] text-text-primary outline-none focus:border-accent"
            />
          </label>
          <label className="text-xs text-text-tertiary">
            Stroke
            <Select
              value={rep.stroke}
              onChange={(e) => onChange({ ...rep, stroke: e.target.value as Stroke })}
              className="mt-1 h-9 text-[13px]"
            >
              {STROKES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-xs text-text-tertiary">
            Interval (sec)
            <input
              inputMode="numeric"
              value={rep.restIntervalSeconds ?? ""}
              onChange={(e) =>
                onChange({
                  ...rep,
                  restIntervalSeconds:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="mt-1 h-9 w-full rounded-lg border border-border bg-bg-elevated px-2 text-[13px] text-text-primary outline-none focus:border-accent"
            />
          </label>
          <label className="text-xs text-text-tertiary">
            RPE (1-10)
            <input
              inputMode="numeric"
              value={rep.rpe ?? ""}
              onChange={(e) =>
                onChange({
                  ...rep,
                  rpe:
                    e.target.value === ""
                      ? null
                      : Math.min(10, Math.max(1, Number(e.target.value))),
                })
              }
              className="mt-1 h-9 w-full rounded-lg border border-border bg-bg-elevated px-2 text-[13px] text-text-primary outline-none focus:border-accent"
            />
          </label>
          <label className="col-span-2 text-xs text-text-tertiary">
            Notes
            <input
              value={rep.notes ?? ""}
              onChange={(e) => onChange({ ...rep, notes: e.target.value || undefined })}
              placeholder="optional"
              className="mt-1 h-9 w-full rounded-lg border border-border bg-bg-elevated px-2 text-[13px] text-text-primary outline-none focus:border-accent"
            />
          </label>
          <div className="col-span-2 flex items-center justify-between gap-2">
            <span className="text-xs text-text-tertiary">Start</span>
            <Segmented
              options={[
                { label: "Push", value: "push" as StartType },
                { label: "Dive", value: "dive" as StartType },
              ]}
              value={rep.start}
              onChange={(v) => onChange({ ...rep, start: v })}
            />
          </div>
          <div className="col-span-2 flex items-center justify-between gap-2">
            <span className="text-xs text-text-tertiary">Suit</span>
            <Segmented
              options={[
                { label: "Practice", value: "practice" as SuitType },
                { label: "Tech", value: "tech" as SuitType },
              ]}
              value={rep.suit}
              onChange={(v) => onChange({ ...rep, suit: v })}
            />
          </div>
        </div>
      )}
    </div>
  );
}
