import { newId } from "./db";
import { cloneLinesWithFreshIds, totalDistance } from "./lineTree";
import type { Course, EnergyFocus, Practice, PracticeSet, SetTemplate } from "./types";

const ENERGY_FOCUS_LABEL: Record<EnergyFocus, string> = {
  aerobic: "Aerobic",
  threshold: "Threshold",
  sprint: "Sprint",
  lactate: "Lactate",
  other: "Other",
};

export const ENERGY_FOCUS_OPTIONS: EnergyFocus[] = [
  "aerobic",
  "threshold",
  "sprint",
  "lactate",
  "other",
];

/** Total yardage/meterage across every set in the practice. */
export function practiceTotalDistance(practice: Practice): number {
  return practice.sets.reduce((sum, set) => sum + totalDistance(set.lines), 0);
}

export function energyFocusLabel(focus: EnergyFocus): string {
  return ENERGY_FOCUS_LABEL[focus];
}

/** e.g. "Total: 3,200 yards · Aerobic" */
export function practiceSummaryLine(practice: Practice): string {
  const unit = practice.course === "SCY" ? "yards" : "meters";
  const distance = practiceTotalDistance(practice).toLocaleString();
  return `Total: ${distance} ${unit} · ${energyFocusLabel(practice.focus ?? "aerobic")}`;
}

export function emptyPracticeSet(): PracticeSet {
  return { id: newId(), type: "aerobic", label: "", lines: [], reps: [] };
}

/** Builds a fresh, unsaved Practice — one empty block ready for line-by-line editing. */
export function newPractice(date: string, course: Course = "SCY", initialSet?: PracticeSet): Practice {
  const now = new Date().toISOString();
  return {
    id: newId(),
    date,
    course,
    customPoolLengthMeters: null,
    focus: "aerobic",
    sets: [initialSet ?? emptyPracticeSet()],
    sleepHours: null,
    bodyWeightLbs: null,
    gymThatDay: false,
    overallRpe: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function emptySetTemplate(): SetTemplate {
  return {
    id: newId(),
    type: "aerobic",
    label: "",
    course: "SCY",
    lines: [],
    createdAt: new Date().toISOString(),
  };
}

/** Instantiates a saved template as a fresh block, ready to drop into a practice. */
export function makeSetFromTemplate(template: SetTemplate): PracticeSet {
  return {
    id: newId(),
    type: template.type,
    label: template.label,
    lines: cloneLinesWithFreshIds(template.lines),
    reps: [],
  };
}
