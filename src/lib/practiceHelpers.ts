import { newId } from "./db";
import type { PracticeSet, Rep, SetType, StartType, Stroke, SuitType } from "./types";

export function makeRep(
  index: number,
  distance: number,
  stroke: Stroke,
  interval: number | null,
  start: StartType,
  suit: SuitType,
): Rep {
  return {
    id: newId(),
    repIndex: index,
    distance,
    stroke,
    time: null,
    strokeCount: null,
    restIntervalSeconds: interval,
    rpe: null,
    start,
    suit,
  };
}

export function makeReps(
  count: number,
  distance: number,
  stroke: Stroke,
  interval: number | null,
  start: StartType,
  suit: SuitType,
): Rep[] {
  return Array.from({ length: count }, (_, i) =>
    makeRep(i + 1, distance, stroke, interval, start, suit),
  );
}

export function makeSetFromTemplate(
  type: SetType,
  label: string,
  count: number,
  distance: number,
  stroke: Stroke,
  interval: number | null,
): PracticeSet {
  return {
    id: newId(),
    type,
    label,
    reps: makeReps(count, distance, stroke, interval, "push", "practice"),
  };
}

const PENDING_KEY = "swim-coach:pending-set";

export function stashPendingSet(set: PracticeSet, course: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_KEY, JSON.stringify({ set, course }));
}

export function takePendingSet(): { set: PracticeSet; course: string } | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  window.sessionStorage.removeItem(PENDING_KEY);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
