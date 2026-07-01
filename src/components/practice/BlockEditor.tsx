"use client";

import { useState } from "react";
import { Trash2, RefreshCw } from "lucide-react";
import type { PracticeSet, Rep, RepGroupLine, RoundLine, SetType } from "@/lib/types";
import { makeRepGroupLine, makeRoundLine, makeTextLine, removeLineById, expandLinesToReps } from "@/lib/lineTree";
import { NotationDocument } from "./NotationDocument";
import { LineComposer } from "./LineComposer";
import { RepRow } from "./RepRow";
import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";

const SET_TYPES: { label: string; value: SetType }[] = [
  { label: "Aerobic", value: "aerobic" },
  { label: "Threshold", value: "threshold" },
  { label: "Sprint", value: "sprint" },
  { label: "Lactate", value: "lactate" },
];

export function BlockEditor({
  block,
  onChange,
  onRemove,
}: {
  block: PracticeSet;
  onChange: (block: PracticeSet) => void;
  onRemove: () => void;
}) {
  const [openRound, setOpenRound] = useState<RoundLine | null>(null);

  function commitLine(partial: Omit<RepGroupLine, "kind" | "id">) {
    const line = makeRepGroupLine(partial);
    if (openRound) {
      setOpenRound({ ...openRound, items: [...openRound.items, line] });
    } else {
      onChange({ ...block, lines: [...block.lines, line] });
    }
  }

  function addTextLine(text: string) {
    const line = makeTextLine(text);
    if (openRound) {
      setOpenRound({ ...openRound, items: [...openRound.items, line] });
    } else {
      onChange({ ...block, lines: [...block.lines, line] });
    }
  }

  function startRound(multiplier: number) {
    setOpenRound(makeRoundLine(multiplier));
  }

  function closeRound() {
    if (!openRound) return;
    onChange({ ...block, lines: [...block.lines, openRound] });
    setOpenRound(null);
  }

  function deleteLine(id: string) {
    if (openRound && openRound.items.some((i) => i.id === id)) {
      setOpenRound({ ...openRound, items: openRound.items.filter((i) => i.id !== id) });
      return;
    }
    onChange({ ...block, lines: removeLineById(block.lines, id) });
  }

  function generateReps() {
    if (block.reps.length > 0) {
      if (!confirm("This replaces any times you've already logged for this block. Continue?")) {
        return;
      }
    }
    const reps = expandLinesToReps(block.lines, "push", "practice");
    onChange({ ...block, reps });
  }

  function updateRep(id: string, rep: Rep) {
    onChange({ ...block, reps: block.reps.map((r) => (r.id === id ? rep : r)) });
  }

  function removeRep(id: string) {
    onChange({
      ...block,
      reps: block.reps
        .filter((r) => r.id !== id)
        .map((r, i) => ({ ...r, repIndex: i + 1 })),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <input
          value={block.label}
          onChange={(e) => onChange({ ...block, label: e.target.value })}
          placeholder="Block label (e.g. Main)"
          className="h-9 min-w-0 flex-1 bg-transparent text-base font-medium text-text-primary outline-none placeholder:text-text-tertiary placeholder:font-normal"
        />
        <button type="button" onClick={onRemove} className="p-1 text-text-tertiary">
          <Trash2 size={16} />
        </button>
      </div>

      <Segmented
        options={SET_TYPES}
        value={block.type}
        onChange={(type) => onChange({ ...block, type })}
      />

      <NotationDocument lines={block.lines} onDeleteLine={deleteLine} />

      {openRound && (
        <div className="rounded-xl border border-dashed border-accent/50 p-2">
          <p className="mb-1 text-xs text-accent">Building {openRound.multiplier}x[ ...</p>
          <NotationDocument lines={openRound.items} onDeleteLine={deleteLine} />
        </div>
      )}

      <LineComposer
        roundDepth={openRound ? 1 : 0}
        onCommitLine={commitLine}
        onStartRound={startRound}
        onCloseRound={closeRound}
        onAddTextLine={addTextLine}
      />

      {block.lines.length > 0 && (
        <Button variant="secondary" size="sm" className="w-full" onClick={generateReps}>
          <RefreshCw size={14} />
          {block.reps.length > 0 ? "Regenerate rep log" : "Generate rep log"}
        </Button>
      )}

      {block.reps.length > 0 && (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-text-tertiary">Log times</p>
          {block.reps.map((rep) => (
            <RepRow key={rep.id} rep={rep} onChange={(r) => updateRep(rep.id, r)} onRemove={() => removeRep(rep.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
