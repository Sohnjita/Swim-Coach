// Course-specific times lookups for the Times page and the Home Power
// Index. Deliberately separate from scoring.ts's cross-course-normalized
// engine — the user wants raw, per-course numbers here, not LCM-equivalent
// blended ones.

import { clamp } from "./scoring";
import {
  eventDistance,
  eventsInCategory,
  eventStroke,
  SWIM_EVENTS,
  type StrokeCategory,
  type SwimEvent,
} from "./events";
import type { Course, MeetResult, Practice, QualifyingStandard, StartType, SuitType } from "./types";

export interface BestPracticeTime {
  suit: SuitType;
  start: StartType;
  timeSeconds: number;
  date: string;
  practiceId: string;
}

/** Best logged rep time per (suit, start) bucket, for one event in one course. Raw times, no normalization. */
export function bestPracticeTimes(
  practices: Practice[],
  event: SwimEvent,
  course: Course,
): BestPracticeTime[] {
  const stroke = eventStroke(event);
  const distance = eventDistance(event, course);
  const bestByBucket = new Map<string, BestPracticeTime>();
  for (const practice of practices) {
    if (practice.course !== course) continue;
    for (const set of practice.sets) {
      for (const rep of set.reps) {
        if (rep.time === null || rep.stroke !== stroke || rep.distance !== distance) continue;
        const key = `${rep.suit}-${rep.start}`;
        const existing = bestByBucket.get(key);
        if (!existing || rep.time < existing.timeSeconds) {
          bestByBucket.set(key, {
            suit: rep.suit,
            start: rep.start,
            timeSeconds: rep.time,
            date: practice.date,
            practiceId: practice.id,
          });
        }
      }
    }
  }
  return [...bestByBucket.values()].sort((a, b) => a.timeSeconds - b.timeSeconds);
}

export function bestMeetResult(
  results: MeetResult[],
  event: SwimEvent,
  course: Course,
): MeetResult | null {
  let best: MeetResult | null = null;
  for (const r of results) {
    if (r.event !== event || r.course !== course) continue;
    if (!best || r.timeSeconds < best.timeSeconds) best = r;
  }
  return best;
}

export function standardsForEvent(
  standards: QualifyingStandard[],
  event: SwimEvent,
  course: Course,
  gender: "M" | "F",
): QualifyingStandard[] {
  return standards
    .filter((s) => s.event === event && s.course === course && s.gender === gender)
    .sort((a, b) => a.timeSeconds - b.timeSeconds);
}

/** Every standard a given time beats, toughest (fastest) first. */
export function achievedStandards(
  standards: QualifyingStandard[],
  event: SwimEvent,
  course: Course,
  gender: "M" | "F",
  timeSeconds: number,
): QualifyingStandard[] {
  return standardsForEvent(standards, event, course, gender).filter(
    (s) => timeSeconds <= s.timeSeconds,
  );
}

const REACH_SENSITIVITY = 8; // points lost per 1% slower than the target standard

/** 0-100: how close the swimmer's best result in this event is to the toughest cut it beats (or nearest one otherwise). */
function eventReach(
  standards: QualifyingStandard[],
  results: MeetResult[],
  event: SwimEvent,
  gender: "M" | "F",
): number | null {
  const eventResults = results.filter((r) => r.event === event);
  if (eventResults.length === 0) return null;

  let best: number | null = null;
  for (const result of eventResults) {
    const candidates = standardsForEvent(standards, event, result.course, gender);
    if (candidates.length === 0) continue;
    const beaten = candidates.filter((s) => result.timeSeconds <= s.timeSeconds);
    const target = beaten.length > 0 ? beaten[0] : candidates[candidates.length - 1];
    const percentGap = ((result.timeSeconds - target.timeSeconds) / target.timeSeconds) * 100;
    const reach = clamp(100 - percentGap * REACH_SENSITIVITY);
    if (best === null || reach > best) best = reach;
  }
  return best;
}

/** Average reach across a stroke category's events — one Power Index vertex. Null = no data yet. */
export function categoryReach(
  standards: QualifyingStandard[],
  results: MeetResult[],
  category: StrokeCategory,
  gender: "M" | "F",
): number | null {
  const scores = eventsInCategory(category)
    .map((event) => eventReach(standards, results, event, gender))
    .filter((s): s is number => s !== null);
  if (scores.length === 0) return null;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

// -1 = fully distance-leaning, 1 = fully sprint-leaning. IM isn't coded (no
// short/long variants in this catalog) so it's left out of the lean calc.
const SPRINT_LEAN: Partial<Record<SwimEvent, number>> = {
  "free-50": 1,
  "back-50": 1,
  "breast-50": 1,
  "fly-50": 1,
  "free-100": 0.5,
  "back-100": 0.5,
  "breast-100": 0.5,
  "fly-100": 0.5,
  "free-200": 0,
  "back-200": 0,
  "breast-200": 0,
  "fly-200": 0,
  "free-400-500": -0.6,
  "free-800-1000": -0.85,
  "free-1500-1650": -1,
};

/** Reach-weighted average sprint/distance lean across every event, for the Power Index fill gradient. */
export function sprintDistanceLean(
  standards: QualifyingStandard[],
  results: MeetResult[],
  gender: "M" | "F",
): number {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const event of SWIM_EVENTS) {
    const lean = SPRINT_LEAN[event];
    if (lean === undefined) continue;
    const reach = eventReach(standards, results, event, gender);
    if (reach === null) continue;
    weightedSum += lean * reach;
    totalWeight += reach;
  }
  if (totalWeight === 0) return 0;
  return clamp(weightedSum / totalWeight, -1, 1);
}
