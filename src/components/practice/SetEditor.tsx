"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { PracticeSet, Rep, SetType, StartType, Stroke, SuitType } from "@/lib/types";
import { makeRep } from "@/lib/practiceHelpers";
import { RepRow } from "./RepRow";
import { Segmented } from "@/components/ui/Segmented";
import { Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

const SET_TYPES: { label: string; value: SetType }[] = [
  { label: "Aerobic", value: "aerobic" },
  { label: "Threshold", value: "threshold" },
  { label: "Sprint", value: "sprint" },
  { label: "Lactate", value: "lactate" },
];

const STROKES: { label: string; value: Stroke }[] = [
  { label: "Free", value: "free" },
  { label: "Back", value: "back" },
  { label: "Breast", value: "breast" },
  { label: "Fly", value: "fly" },
  { label: "IM", value: "im" },
  { label: "Kick", value: "kick" },
  { label: "Drill", value: "drill" },
];

export function SetEditor({
  set,
  onChange,
  onRemove,
}: {
  set: PracticeSet;
  onChange: (set: PracticeSet) => void;
  onRemove: () => void;
}) {
  const [defaults, setDefaults] = useState({
    distance: set.reps[0]?.distance ?? 100,
    stroke: set.reps[0]?.stroke ?? ("breast" as Stroke),
    count: Math.max(set.reps.length, 1),
    interval: set.reps[0]?.restIntervalSeconds ?? 90,
    start: set.reps[0]?.start ?? ("push" as StartType),
    suit: set.reps[0]?.suit ?? ("practice" as SuitType),
  });

  function generateReps() {
    const reps = Array.from({ length: defaults.count }, (_, i) =>
      makeRep(
        i + 1,
        defaults.distance,
        defaults.stroke,
        defaults.interval,
        defaults.start,
        defaults.suit,
      ),
    );
    onChange({
      ...set,
      reps,
      label:
        set.label || `${defaults.count}x${defaults.distance} ${labelForStroke(defaults.stroke)}`,
    });
  }

  function addRep() {
    const last = set.reps[set.reps.length - 1];
    const rep = makeRep(
      set.reps.length + 1,
      last?.distance ?? defaults.distance,
      last?.stroke ?? defaults.stroke,
      last?.restIntervalSeconds ?? defaults.interval,
      last?.start ?? defaults.start,
      last?.suit ?? defaults.suit,
    );
    onChange({ ...set, reps: [...set.reps, rep] });
  }

  function updateRep(id: string, rep: Rep) {
    onChange({ ...set, reps: set.reps.map((r) => (r.id === id ? rep : r)) });
  }

  function removeRep(id: string) {
    onChange({
      ...set,
      reps: set.reps
        .filter((r) => r.id !== id)
        .map((r, i) => ({ ...r, repIndex: i + 1 })),
    });
  }

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-2">
        <Segmented
          options={SET_TYPES}
          value={set.type}
          onChange={(type) => onChange({ ...set, type })}
        />
        <button type="button" onClick={onRemove} className="p-1 text-text-tertiary">
          <Trash2 size={16} />
        </button>
      </div>

      <Input
        placeholder="Set label (e.g. 8x100 Breast Descend)"
        value={set.label}
        onChange={(e) => onChange({ ...set, label: e.target.value })}
        className="mb-3"
      />

      {set.reps.length === 0 ? (
        <div className="space-y-2 rounded-xl border border-dashed border-border p-3">
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-text-tertiary">
              Reps
              <input
                inputMode="numeric"
                value={defaults.count}
                onChange={(e) =>
                  setDefaults((d) => ({ ...d, count: Number(e.target.value) || 1 }))
                }
                className="mt-1 h-9 w-full rounded-lg border border-border bg-bg-elevated-2 px-2 text-sm text-text-primary outline-none focus:border-accent"
              />
            </label>
            <label className="text-xs text-text-tertiary">
              Distance
              <input
                inputMode="numeric"
                value={defaults.distance}
                onChange={(e) =>
                  setDefaults((d) => ({ ...d, distance: Number(e.target.value) || 0 }))
                }
                className="mt-1 h-9 w-full rounded-lg border border-border bg-bg-elevated-2 px-2 text-sm text-text-primary outline-none focus:border-accent"
              />
            </label>
            <label className="text-xs text-text-tertiary">
              Stroke
              <Select
                value={defaults.stroke}
                onChange={(e) =>
                  setDefaults((d) => ({ ...d, stroke: e.target.value as Stroke }))
                }
                className="mt-1 h-9 text-sm"
              >
                {STROKES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-text-tertiary">
              Interval (sec)
              <input
                inputMode="numeric"
                value={defaults.interval}
                onChange={(e) =>
                  setDefaults((d) => ({ ...d, interval: Number(e.target.value) || 0 }))
                }
                className="mt-1 h-9 w-full rounded-lg border border-border bg-bg-elevated-2 px-2 text-sm text-text-primary outline-none focus:border-accent"
              />
            </label>
            <div className="col-span-2">
              <span className="text-xs text-text-tertiary">Start / Suit</span>
              <div className="mt-1 flex gap-2">
                <Segmented
                  options={[
                    { label: "Push", value: "push" as StartType },
                    { label: "Dive", value: "dive" as StartType },
                  ]}
                  value={defaults.start}
                  onChange={(start) => setDefaults((d) => ({ ...d, start }))}
                />
                <Segmented
                  options={[
                    { label: "Practice", value: "practice" as SuitType },
                    { label: "Tech", value: "tech" as SuitType },
                  ]}
                  value={defaults.suit}
                  onChange={(suit) => setDefaults((d) => ({ ...d, suit }))}
                />
              </div>
            </div>
          </div>
          <Button size="sm" onClick={generateReps} className="w-full">
            Generate reps
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {set.reps.map((rep) => (
            <RepRow
              key={rep.id}
              rep={rep}
              onChange={(r) => updateRep(rep.id, r)}
              onRemove={() => removeRep(rep.id)}
            />
          ))}
          <Button variant="secondary" size="sm" onClick={addRep} className="w-full">
            <Plus size={14} /> Add rep
          </Button>
        </div>
      )}
    </Card>
  );
}

function labelForStroke(stroke: Stroke): string {
  return stroke.charAt(0).toUpperCase() + stroke.slice(1);
}
