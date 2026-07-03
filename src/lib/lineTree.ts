import { newId } from "./db";
import { formatInterval } from "./conversions";
import type {
  PracticeLine,
  Rep,
  RepGroupLine,
  RoundLine,
  StartType,
  Stroke,
  SuitType,
  TextLine,
} from "./types";

const STROKE_LABEL: Record<Stroke, string> = {
  free: "free",
  back: "back",
  breast: "breast",
  fly: "fly",
  im: "im",
  kick: "kick",
  drill: "drill",
};

export function makeRepGroupLine(
  partial: Partial<Omit<RepGroupLine, "kind" | "id">> = {},
): RepGroupLine {
  return {
    kind: "reps",
    id: newId(),
    count: partial.count ?? 4,
    distance: partial.distance ?? 100,
    intervalSeconds: partial.intervalSeconds ?? null,
    stroke: partial.stroke,
    modifier: partial.modifier ?? "swim",
    tag: partial.tag,
  };
}

export function makeTextLine(text: string): TextLine {
  return { kind: "text", id: newId(), text };
}

export function makeRoundLine(multiplier: number): RoundLine {
  return { kind: "round", id: newId(), multiplier, items: [] };
}

/** Renders a single line (and, for rounds, its children) as plain notation text. */
export function formatLine(line: PracticeLine, indent = 0): string[] {
  const pad = "  ".repeat(indent);
  if (line.kind === "text") {
    return [`${pad}${line.text}`];
  }
  if (line.kind === "reps") {
    const parts = [`${line.count}x${line.distance}`];
    if (line.intervalSeconds !== null) {
      parts.push(`on ${formatInterval(line.intervalSeconds)}`);
    }
    if (line.stroke) parts.push(STROKE_LABEL[line.stroke]);
    if (line.modifier !== "swim") parts.push(line.modifier);
    if (line.tag) parts.push(line.tag);
    return [`${pad}${parts.join(" ")}`];
  }
  // round
  const inner = line.items.flatMap((item) => formatLine(item, indent + 1));
  return [`${pad}${line.multiplier}x[`, ...inner, `${pad}]`];
}

export function formatLines(lines: PracticeLine[]): string[] {
  return lines.flatMap((line) => formatLine(line));
}

/** Recursively removes a line by id from a (possibly nested) line tree. */
export function removeLineById(lines: PracticeLine[], id: string): PracticeLine[] {
  return lines
    .filter((line) => line.id !== id)
    .map((line) =>
      line.kind === "round" ? { ...line, items: removeLineById(line.items, id) } : line,
    );
}

/** Recursively replaces a line by id (preserving its position) in a line tree. */
export function updateLineById(
  lines: PracticeLine[],
  id: string,
  next: PracticeLine,
): PracticeLine[] {
  return lines.map((line) => {
    if (line.id === id) return next;
    if (line.kind === "round") {
      return { ...line, items: updateLineById(line.items, id, next) };
    }
    return line;
  });
}

/** Expands notation lines into flat, unlogged Rep instances (times/RPE/strokeCount null). */
export function expandLinesToReps(
  lines: PracticeLine[],
  start: StartType,
  suit: SuitType,
): Rep[] {
  const reps: Rep[] = [];

  function walk(items: PracticeLine[], repeat: number) {
    for (let t = 0; t < repeat; t++) {
      for (const item of items) {
        if (item.kind === "reps") {
          for (let i = 0; i < item.count; i++) {
            reps.push({
              id: newId(),
              repIndex: reps.length + 1,
              distance: item.distance,
              stroke: item.stroke ?? "free",
              time: null,
              strokeCount: null,
              restIntervalSeconds: item.intervalSeconds,
              rpe: null,
              start,
              suit,
              notes: item.tag,
            });
          }
        } else if (item.kind === "round") {
          walk(item.items, item.multiplier);
        }
      }
    }
  }

  walk(lines, 1);
  return reps;
}

/** Recursively appends an item into a round (by id) anywhere in the line tree. */
export function appendItemToRound(
  lines: PracticeLine[],
  roundId: string,
  item: PracticeLine,
): PracticeLine[] {
  return lines.map((line) => {
    if (line.kind !== "round") return line;
    if (line.id === roundId) return { ...line, items: [...line.items, item] };
    return { ...line, items: appendItemToRound(line.items, roundId, item) };
  });
}

/** Finds the first rep-group line in a (possibly nested) line tree, if any. */
export function findFirstRepsLine(lines: PracticeLine[]): RepGroupLine | null {
  for (const line of lines) {
    if (line.kind === "reps") return line;
    if (line.kind === "round") {
      const found = findFirstRepsLine(line.items);
      if (found) return found;
    }
  }
  return null;
}

/** Deep-clones a line tree with fresh ids at every level (for instantiating a saved template). */
export function cloneLinesWithFreshIds(lines: PracticeLine[]): PracticeLine[] {
  return lines.map((line) => {
    if (line.kind === "round") {
      return { ...line, id: newId(), items: cloneLinesWithFreshIds(line.items) };
    }
    return { ...line, id: newId() };
  });
}

export function countReps(lines: PracticeLine[]): number {
  let total = 0;
  for (const line of lines) {
    if (line.kind === "reps") total += line.count;
    else if (line.kind === "round") total += line.multiplier * countReps(line.items);
  }
  return total;
}

export function totalDistance(lines: PracticeLine[]): number {
  let total = 0;
  for (const line of lines) {
    if (line.kind === "reps") total += line.count * line.distance;
    else if (line.kind === "round") total += line.multiplier * totalDistance(line.items);
  }
  return total;
}
