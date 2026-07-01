import { newId } from "./db";
import { expandLinesToReps, makeRepGroupLine } from "./lineTree";
import type { PracticeSet, SetType, Stroke } from "./types";

export function makeSetFromTemplate(
  type: SetType,
  label: string,
  count: number,
  distance: number,
  stroke: Stroke,
  interval: number | null,
): PracticeSet {
  const lines = [
    makeRepGroupLine({ count, distance, stroke, intervalSeconds: interval, modifier: "swim" }),
  ];
  return {
    id: newId(),
    type,
    label,
    lines,
    reps: expandLinesToReps(lines, "push", "practice"),
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
