import { newId } from "./db";
import { expandLinesToReps, makeRepGroupLine, totalDistance } from "./lineTree";
import type { Practice, PracticeSet, SetType, Stroke } from "./types";

export type EnergyFocus = SetType | "other";

const ENERGY_FOCUS_LABEL: Record<EnergyFocus, string> = {
  aerobic: "Aerobic",
  threshold: "Threshold",
  sprint: "Sprint",
  lactate: "Lactate",
  other: "Other",
};

/** Total yardage/meterage across every set in the practice. */
export function practiceTotalDistance(practice: Practice): number {
  return practice.sets.reduce((sum, set) => sum + totalDistance(set.lines), 0);
}

/** The set type carrying the most distance in the practice — its dominant energy system. */
export function practiceEnergyFocus(practice: Practice): EnergyFocus {
  const distanceByType = new Map<SetType, number>();
  for (const set of practice.sets) {
    const dist = totalDistance(set.lines);
    distanceByType.set(set.type, (distanceByType.get(set.type) ?? 0) + dist);
  }
  let focus: EnergyFocus = "other";
  let focusDistance = 0;
  for (const [type, dist] of distanceByType) {
    if (dist > focusDistance) {
      focus = type;
      focusDistance = dist;
    }
  }
  return focus;
}

export function energyFocusLabel(focus: EnergyFocus): string {
  return ENERGY_FOCUS_LABEL[focus];
}

/** e.g. "Total: 3,200 yards · Aerobic" */
export function practiceSummaryLine(practice: Practice): string {
  const unit = practice.course === "SCY" ? "yards" : "meters";
  const distance = practiceTotalDistance(practice).toLocaleString();
  return `Total: ${distance} ${unit} · ${energyFocusLabel(practiceEnergyFocus(practice))}`;
}

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
