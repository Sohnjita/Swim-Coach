"use client";

import { useState } from "react";
import { Plus, Brackets, Type, X } from "lucide-react";
import type { LineModifier, RepGroupLine, Stroke } from "@/lib/types";
import { formatInterval, parseInterval } from "@/lib/conversions";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

const DISTANCE_PRESETS = [25, 50, 100, 200];
const COUNT_PRESETS = [1, 2, 4, 6, 8];

const STROKES: { label: string; value: Stroke }[] = [
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

function Chip({
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
        "shrink-0 rounded-full px-3 py-1 text-xs whitespace-nowrap transition-colors",
        active
          ? "bg-accent text-accent-text font-medium"
          : "bg-bg-elevated-2 text-text-secondary border border-border",
      )}
    >
      {children}
    </button>
  );
}

export function LineComposer({
  roundDepth,
  onCommitLine,
  onStartRound,
  onCloseRound,
  onAddTextLine,
}: {
  roundDepth: number;
  onCommitLine: (line: Omit<RepGroupLine, "kind" | "id">) => void;
  onStartRound: (multiplier: number) => void;
  onCloseRound: () => void;
  onAddTextLine: (text: string) => void;
}) {
  const [count, setCount] = useState(4);
  const [distance, setDistance] = useState(100);
  const [intervalText, setIntervalText] = useState("1:30");
  const [stroke, setStroke] = useState<Stroke>("breast");
  const [modifier, setModifier] = useState<LineModifier>("swim");
  const [tag, setTag] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [textValue, setTextValue] = useState("");
  const [showRoundPrompt, setShowRoundPrompt] = useState(false);
  const [roundMultiplier, setRoundMultiplier] = useState(2);

  function commit() {
    onCommitLine({
      count,
      distance,
      intervalSeconds: parseInterval(intervalText),
      stroke,
      modifier,
      tag: tag.trim() || undefined,
    });
    setTag("");
  }

  return (
    <div className="surface-card rounded-2xl border border-border p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex items-center gap-1">
          <input
            inputMode="numeric"
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 0)}
            className="h-10 w-12 rounded-lg border border-border bg-bg-elevated-2 text-center text-sm text-text-primary outline-none focus:border-accent"
          />
          <span className="text-text-tertiary">x</span>
          <input
            inputMode="numeric"
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value) || 0)}
            className="h-10 w-16 rounded-lg border border-border bg-bg-elevated-2 text-center text-sm text-text-primary outline-none focus:border-accent"
          />
        </div>
        <span className="text-xs text-text-tertiary">on</span>
        <input
          value={intervalText}
          onChange={(e) => setIntervalText(e.target.value)}
          placeholder="1:30"
          className="h-10 w-16 rounded-lg border border-border bg-bg-elevated-2 text-center text-sm text-text-primary outline-none focus:border-accent"
        />
        <input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="tag"
          className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-bg-elevated-2 px-2 text-sm text-text-primary outline-none focus:border-accent"
        />
      </div>

      <div className="mb-2 flex gap-1 overflow-x-auto">
        {COUNT_PRESETS.map((c) => (
          <Chip key={c} active={count === c} onClick={() => setCount(c)}>
            {c}
          </Chip>
        ))}
        <span className="mx-1 self-center text-text-tertiary">·</span>
        {DISTANCE_PRESETS.map((d) => (
          <Chip key={d} active={distance === d} onClick={() => setDistance(d)}>
            {d}
          </Chip>
        ))}
      </div>

      <div className="mb-2 flex gap-1 overflow-x-auto">
        {STROKES.map((s) => (
          <Chip key={s.value} active={stroke === s.value} onClick={() => setStroke(s.value)}>
            {s.label}
          </Chip>
        ))}
      </div>

      <div className="mb-3 flex gap-1 overflow-x-auto">
        {MODIFIERS.map((m) => (
          <Chip key={m.value} active={modifier === m.value} onClick={() => setModifier(m.value)}>
            {m.label}
          </Chip>
        ))}
      </div>

      {showTextInput && (
        <div className="mb-2 flex gap-2">
          <input
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            placeholder="Note (e.g. Odds: free breathe every 5)"
            className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-bg-elevated-2 px-2 text-sm text-text-primary outline-none focus:border-accent"
          />
          <Button
            size="sm"
            onClick={() => {
              if (!textValue.trim()) return;
              onAddTextLine(textValue.trim());
              setTextValue("");
              setShowTextInput(false);
            }}
          >
            Add
          </Button>
        </div>
      )}

      {showRoundPrompt && (
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs text-text-tertiary">Repeat</span>
          <input
            inputMode="numeric"
            value={roundMultiplier}
            onChange={(e) => setRoundMultiplier(Number(e.target.value) || 1)}
            className="h-10 w-14 rounded-lg border border-border bg-bg-elevated-2 text-center text-sm text-text-primary outline-none focus:border-accent"
          />
          <span className="text-xs text-text-tertiary">x[</span>
          <Button
            size="sm"
            onClick={() => {
              onStartRound(roundMultiplier);
              setShowRoundPrompt(false);
            }}
          >
            Start
          </Button>
          <button
            type="button"
            onClick={() => setShowRoundPrompt(false)}
            className="p-1 text-text-tertiary"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => setShowTextInput((v) => !v)}>
          <Type size={14} />
        </Button>
        {roundDepth > 0 ? (
          <Button variant="secondary" size="sm" onClick={onCloseRound}>
            Close ] ({roundDepth})
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setShowRoundPrompt((v) => !v)}>
            <Brackets size={14} /> Round
          </Button>
        )}
        <Button size="sm" className="flex-1" onClick={commit}>
          <Plus size={14} /> {count}x{distance}{" "}
          {intervalText ? `on ${formatInterval(parseInterval(intervalText))}` : ""}
        </Button>
      </div>
    </div>
  );
}
