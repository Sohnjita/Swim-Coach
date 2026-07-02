// Parses free-typed set notation (the same shorthand `formatLine` renders,
// e.g. "4x100 on 1:30 breast" or "2x[3x100 on 1:30 breast, 50 easy]") back
// into a PracticeLine tree, for importing practices from pasted text.

import { newId } from "./db";
import { parseInterval } from "./conversions";
import type { LineModifier, PracticeLine, RepGroupLine, RoundLine, Stroke } from "./types";

const STROKE_ALIASES: Record<string, Stroke> = {
  free: "free",
  freestyle: "free",
  back: "back",
  backstroke: "back",
  breast: "breast",
  breaststroke: "breast",
  fly: "fly",
  butterfly: "fly",
  im: "im",
  medley: "im",
};

const MODIFIER_ALIASES: Record<string, LineModifier> = {
  swim: "swim",
  kick: "kick",
  drill: "drill",
  pull: "pull",
};

const REP_LINE = /^(\d+)\s*[xX]\s*(\d+)\s*s?\b\s*(?:on\s+([0-9:]+))?\s*(.*)$/;
const ROUND_INLINE = /^(\d+)\s*[xX]\s*\[(.*)\]\s*$/;
const ROUND_OPEN = /^(\d+)\s*[xX]\s*\[\s*$/;
const ROUND_CLOSE = /^\]\s*$/;
// Fallback for a single un-repeated distance with no "Nx" prefix, e.g. "200 easy".
const BARE_DISTANCE_LINE = /^(\d+)\s*s?\s+(\S.*)$/;

// Guards the bare-distance fallback against misreading annotation lines that
// merely start with a number (dates, years, etc.) — real pool distances are
// always multiples of 25.
function isPlausibleDistance(distance: number): boolean {
  return distance >= 25 && distance <= 2000 && distance % 25 === 0;
}

/** Splits on a separator, ignoring separators nested inside [ ... ]. */
function splitTopLevel(input: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of input) {
    if (ch === "[") depth++;
    if (ch === "]") depth--;
    if (ch === sep && depth <= 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function parseTail(tail: string): { stroke: Stroke; modifier: LineModifier; tag?: string } {
  let stroke: Stroke = "breast";
  let modifier: LineModifier = "swim";
  let strokeSet = false;
  let modifierSet = false;
  const leftover: string[] = [];

  for (const word of tail.split(/\s+/).filter(Boolean)) {
    const lower = word.toLowerCase().replace(/[,.]+$/, "");
    if (!strokeSet && STROKE_ALIASES[lower]) {
      stroke = STROKE_ALIASES[lower];
      strokeSet = true;
      continue;
    }
    if (!modifierSet && MODIFIER_ALIASES[lower]) {
      modifier = MODIFIER_ALIASES[lower];
      modifierSet = true;
      continue;
    }
    leftover.push(word);
  }
  return { stroke, modifier, tag: leftover.length ? leftover.join(" ") : undefined };
}

function parseRepLine(line: string): RepGroupLine | null {
  const m = line.match(REP_LINE);
  if (!m) return null;
  const count = Number(m[1]);
  const distance = Number(m[2]);
  if (!count || !distance) return null;
  const intervalSeconds = m[3] ? parseInterval(m[3]) : null;
  const { stroke, modifier, tag } = parseTail(m[4] ?? "");
  return { kind: "reps", id: newId(), count, distance, intervalSeconds, stroke, modifier, tag };
}

/** Parses one line with no leading/trailing whitespace, no line breaks. */
function parseSingleLine(line: string): PracticeLine {
  const inline = line.match(ROUND_INLINE);
  if (inline) {
    const multiplier = Number(inline[1]);
    const items = splitTopLevel(inline[2], ",").map(parseSingleLine);
    return { kind: "round", id: newId(), multiplier, items };
  }
  const rep = parseRepLine(line);
  if (rep) return rep;

  const bare = line.match(BARE_DISTANCE_LINE);
  if (bare) {
    const distance = Number(bare[1]);
    if (isPlausibleDistance(distance)) {
      const { stroke, modifier, tag } = parseTail(bare[2]);
      return {
        kind: "reps",
        id: newId(),
        count: 1,
        distance,
        intervalSeconds: null,
        stroke,
        modifier,
        tag,
      };
    }
  }

  return { kind: "text", id: newId(), text: line };
}

/** True if a trimmed line reads as a set/round line rather than a label or annotation. */
export function isNotationSetLine(line: string): boolean {
  if (
    ROUND_OPEN.test(line) ||
    ROUND_CLOSE.test(line) ||
    ROUND_INLINE.test(line) ||
    REP_LINE.test(line)
  ) {
    return true;
  }
  const bare = line.match(BARE_DISTANCE_LINE);
  if (!bare) return false;
  return isPlausibleDistance(Number(bare[1]));
}

/**
 * Parses multi-line notation text into a PracticeLine tree. Rounds may be
 * written inline (`2x[3x100 on 1:30 breast, 50 easy]`) or spanning lines
 * (`2x[` then child lines then a lone `]`). Any line that isn't a rep-group
 * or round line becomes a plain annotation (text) line.
 */
export function parseNotationText(text: string): PracticeLine[] {
  const rawLines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const root: PracticeLine[] = [];
  const stack: RoundLine[] = [];

  function currentList(): PracticeLine[] {
    return stack.length ? stack[stack.length - 1].items : root;
  }

  for (const line of rawLines) {
    if (ROUND_CLOSE.test(line)) {
      const closed = stack.pop();
      if (closed) currentList().push(closed);
      continue;
    }
    const open = line.match(ROUND_OPEN);
    if (open) {
      stack.push({ kind: "round", id: newId(), multiplier: Number(open[1]), items: [] });
      continue;
    }
    currentList().push(parseSingleLine(line));
  }
  // Any round left unclosed at end of text is flushed best-effort.
  while (stack.length) {
    const closed = stack.pop()!;
    currentList().push(closed);
  }

  return root;
}
