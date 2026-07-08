// A rule-based "what should I do today" engine. There's no live database of
// performance studies to query — this app has no server or network calls
// (see README) — so this is a curated set of standard periodization/
// recovery heuristics (hard/easy day alternation, ~24-48h neuromuscular
// recovery after high-intensity anaerobic work, pre-meet taper, one easier
// day per week to avoid overtraining) applied to the swimmer's own logged
// history. It's a coaching heuristic, not a physiological model — same
// spirit as trainingPowerIndex.ts and variations.ts.
import { newId } from "./db";
import { addDaysISO } from "./format";
import { cloneLinesWithFreshIds, makeRepGroupLine } from "./lineTree";
import type {
  LineModifier,
  Meet,
  Practice,
  PracticeLine,
  PracticeSet,
  RepGroupLine,
  SetTemplate,
  SetType,
  Stroke,
} from "./types";

const SET_TYPES: SetType[] = ["aerobic", "threshold", "sprint", "lactate", "technique"];

// Hardest-first: a day's "type" for periodization purposes is whichever of
// these is present at all, not whichever racked up the most yardage — a
// short, intense lactate set still defines the day even next to a longer
// easy warmup that happens to be tagged "aerobic".
const DOMINANCE_PRIORITY: SetType[] = ["sprint", "lactate", "threshold", "technique", "aerobic"];

export const FOCUS_LABEL: Record<SetType, string> = {
  aerobic: "Aerobic",
  threshold: "Threshold",
  sprint: "Sprint",
  lactate: "Lactate",
  technique: "Technique",
};

interface DayLoad {
  date: string;
  hasPractice: boolean;
  isMeetDay: boolean;
  isRestDay: boolean;
  dominantType: SetType | null;
}

/** Per-day training load for the `windowDays` before (not including) `forDate`, oldest first. */
function buildTrainingLoad(
  practices: Practice[],
  meets: Meet[],
  forDate: string,
  windowDays: number,
): DayLoad[] {
  const days: DayLoad[] = [];
  for (let i = windowDays; i >= 1; i--) {
    const iso = addDaysISO(forDate, -i);
    const dayPractices = practices.filter((p) => p.date === iso);
    const isMeetDay = meets.some((m) => iso >= m.startDate && iso <= m.endDate);

    // A day's "type" is defined by its hardest content, not raw yardage —
    // a lactate or sprint main set is what defines the training stimulus
    // even when a warmup (routinely tagged "aerobic") technically racks up
    // more total yards than a short, intense main set does.
    const typesPresent = new Set<SetType>();
    for (const practice of dayPractices) {
      for (const set of practice.sets) {
        if (set.lines.length > 0 || set.reps.length > 0) typesPresent.add(set.type);
      }
    }
    const dominantType = DOMINANCE_PRIORITY.find((type) => typesPresent.has(type)) ?? null;

    const hasPractice = dayPractices.length > 0;
    days.push({
      date: iso,
      hasPractice,
      isMeetDay,
      isRestDay: !hasPractice && !isMeetDay,
      dominantType,
    });
  }
  return days;
}

export interface FocusRecommendation {
  focus: SetType;
  reasoning: string[];
}

/**
 * Picks today's recommended set-type focus from the last two weeks of
 * logged practices/meets. Rules are checked in order, first match wins:
 *
 * 1. A meet in the next 2 days -> taper (technique, stay fresh).
 * 2. Competed yesterday -> moderate reentry (threshold), not straight
 *    back to max effort.
 * 3. Yesterday was lactate/sprint -> aerobic, for CNS/neuromuscular
 *    recovery from high-intensity anaerobic work.
 * 4. Coming off 2+ rest days -> threshold, ramp back in gradually.
 * 5. 6+ days trained without a break -> aerobic, a safety-valve easier
 *    day so at least one easier day happens most weeks.
 * 6. 4+ days since any lactate/sprint work -> ramp up into whichever of
 *    the two has been done less this week.
 * 7. Otherwise -> whichever of aerobic/threshold/sprint/lactate has been
 *    the least-used focus this week, to keep training balanced.
 */
export function recommendFocus(
  practices: Practice[],
  meets: Meet[],
  forDate: string,
  windowDays = 14,
): FocusRecommendation {
  const days = buildTrainingLoad(practices, meets, forDate, windowDays);
  const yesterday = days[days.length - 1];

  let daysSinceRest = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].isRestDay) break;
    daysSinceRest++;
  }

  let restStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (!days[i].isRestDay) break;
    restStreak++;
  }

  let daysSinceHighIntensity = windowDays;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].dominantType === "lactate" || days[i].dominantType === "sprint") {
      daysSinceHighIntensity = days.length - 1 - i;
      break;
    }
  }

  const upcomingMeet = meets.find(
    (m) => m.startDate >= forDate && m.startDate <= addDaysISO(forDate, 2),
  );

  const last7 = days.slice(-7);
  const freq: Record<SetType, number> = { aerobic: 0, threshold: 0, sprint: 0, lactate: 0, technique: 0 };
  for (const day of last7) {
    if (day.dominantType) freq[day.dominantType]++;
  }

  if (upcomingMeet) {
    return {
      focus: "technique",
      reasoning: [
        `"${upcomingMeet.name}" starts within 2 days — keeping today light and technique-focused so you're fresh.`,
      ],
    };
  }

  if (yesterday.isMeetDay) {
    return {
      focus: "threshold",
      reasoning: ["You raced yesterday — a moderate day today eases back in without jumping straight to max effort."],
    };
  }

  if (yesterday.dominantType === "lactate" || yesterday.dominantType === "sprint") {
    return {
      focus: "aerobic",
      reasoning: [
        `Yesterday was a ${FOCUS_LABEL[yesterday.dominantType].toLowerCase()} day — aerobic work today aids neuromuscular recovery before the next hard effort.`,
      ],
    };
  }

  if (restStreak >= 2) {
    return {
      focus: "threshold",
      reasoning: [`You've had ${restStreak} days off in a row — ramping back in gradually rather than straight to max intensity.`],
    };
  }

  if (daysSinceRest >= 6) {
    return {
      focus: "aerobic",
      reasoning: [`You've trained ${daysSinceRest} days in a row without a break — dialing back today to avoid overtraining.`],
    };
  }

  if (daysSinceHighIntensity >= 4) {
    const rampType: SetType = freq.lactate <= freq.sprint ? "lactate" : "sprint";
    return {
      focus: rampType,
      reasoning: [`It's been ${daysSinceHighIntensity} days since a lactate/sprint effort — time to push the pace again.`],
    };
  }

  const rotationTypes: SetType[] = ["threshold", "lactate", "sprint", "aerobic"];
  const balanceType = [...rotationTypes].sort((a, b) => freq[a] - freq[b])[0];
  return {
    focus: balanceType,
    reasoning: [`Keeping this week balanced across energy systems — ${FOCUS_LABEL[balanceType].toLowerCase()} has had the least focus so far.`],
  };
}

interface TypicalShape {
  distance: number;
  count: number;
  intervalSeconds: number | null;
  stroke: Stroke;
}

const DEFAULT_SHAPE: Record<SetType, TypicalShape> = {
  aerobic: { distance: 500, count: 1, intervalSeconds: null, stroke: "breast" },
  threshold: { distance: 100, count: 6, intervalSeconds: 90, stroke: "breast" },
  lactate: { distance: 100, count: 4, intervalSeconds: 300, stroke: "breast" },
  sprint: { distance: 50, count: 6, intervalSeconds: 120, stroke: "breast" },
  technique: { distance: 50, count: 8, intervalSeconds: 60, stroke: "breast" },
};

const FOCUS_TAG: Record<SetType, string> = {
  aerobic: "aerobic pace",
  threshold: "best avg",
  lactate: "race",
  sprint: "race",
  technique: "technique focus",
};

const FOCUS_MODIFIER: Record<SetType, LineModifier> = {
  aerobic: "swim",
  threshold: "swim",
  lactate: "swim",
  sprint: "swim",
  technique: "drill",
};

function flattenRepsLines(lines: PracticeLine[]): RepGroupLine[] {
  const out: RepGroupLine[] = [];
  for (const line of lines) {
    if (line.kind === "reps") out.push(line);
    else if (line.kind === "round") out.push(...flattenRepsLines(line.items));
  }
  return out;
}

function median(nums: number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** The swimmer's own typical distance/count/interval/stroke for this set type, if they've logged any. */
function typicalShapeForType(practices: Practice[], setType: SetType): TypicalShape | null {
  const repsLines: RepGroupLine[] = [];
  for (const practice of practices) {
    for (const set of practice.sets) {
      if (set.type !== setType) continue;
      repsLines.push(...flattenRepsLines(set.lines));
    }
  }
  if (repsLines.length === 0) return null;

  const intervals = repsLines.filter((l) => l.intervalSeconds !== null).map((l) => l.intervalSeconds!);
  const strokeTally = new Map<Stroke, number>();
  for (const l of repsLines) {
    if (l.stroke) strokeTally.set(l.stroke, (strokeTally.get(l.stroke) ?? 0) + 1);
  }
  let bestStroke: Stroke = "breast";
  let bestCount = 0;
  for (const [stroke, count] of strokeTally) {
    if (count > bestCount) {
      bestStroke = stroke;
      bestCount = count;
    }
  }

  return {
    distance: Math.max(25, Math.round(median(repsLines.map((l) => l.distance)) / 25) * 25),
    count: Math.max(1, Math.round(median(repsLines.map((l) => l.count)))),
    intervalSeconds: intervals.length ? Math.round(median(intervals)) : DEFAULT_SHAPE[setType].intervalSeconds,
    stroke: bestStroke,
  };
}

/** Picks the saved template of this type least recently logged (by matching label), or null if none exist. */
function pickTemplate(
  templates: SetTemplate[],
  focus: SetType,
  practices: Practice[],
): SetTemplate | null {
  const candidates = templates.filter((t) => t.type === focus);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const lastUsed = new Map<string, string>();
  for (const practice of practices) {
    for (const set of practice.sets) {
      if (set.type !== focus) continue;
      const existing = lastUsed.get(set.label);
      if (!existing || practice.date > existing) lastUsed.set(set.label, practice.date);
    }
  }
  return [...candidates].sort((a, b) => {
    const da = lastUsed.get(a.label) ?? "";
    const db = lastUsed.get(b.label) ?? "";
    return da.localeCompare(db);
  })[0];
}

function generateLinesForFocus(setType: SetType, practices: Practice[]): PracticeLine[] {
  const shape = typicalShapeForType(practices, setType) ?? DEFAULT_SHAPE[setType];
  return [
    makeRepGroupLine({
      count: shape.count,
      distance: shape.distance,
      intervalSeconds: shape.intervalSeconds,
      stroke: shape.stroke,
      modifier: FOCUS_MODIFIER[setType],
      tag: FOCUS_TAG[setType],
    }),
  ];
}

export interface SetRecommendation {
  focus: SetType;
  reasoning: string[];
  source: "template" | "generated";
  template?: SetTemplate;
  label: string;
  lines: PracticeLine[];
}

/** Combines recommendFocus with either a matching saved template or a freshly generated set. */
export function recommendSet(
  practices: Practice[],
  meets: Meet[],
  setTemplates: SetTemplate[],
  forDate: string,
): SetRecommendation {
  const { focus, reasoning } = recommendFocus(practices, meets, forDate);
  const template = pickTemplate(setTemplates, focus, practices);
  if (template) {
    return {
      focus,
      reasoning,
      source: "template",
      template,
      label: template.label || FOCUS_LABEL[focus],
      lines: cloneLinesWithFreshIds(template.lines),
    };
  }
  return {
    focus,
    reasoning,
    source: "generated",
    label: `${FOCUS_LABEL[focus]} (suggested)`,
    lines: generateLinesForFocus(focus, practices),
  };
}

/** Turns a recommendation into a fresh, unsaved PracticeSet ready to drop into a practice. */
export function recommendationToPracticeSet(recommendation: SetRecommendation): PracticeSet {
  return {
    id: newId(),
    type: recommendation.focus,
    label: recommendation.label,
    lines: recommendation.lines,
    reps: [],
    setScore: null,
  };
}

/** The course of the swimmer's most recent practice, or SCY if they have none yet. */
export function mostRecentCourse(practices: Practice[]): Practice["course"] {
  const sorted = [...practices].sort((a, b) => b.date.localeCompare(a.date));
  return sorted[0]?.course ?? "SCY";
}

export { SET_TYPES as ALL_SET_TYPES };
