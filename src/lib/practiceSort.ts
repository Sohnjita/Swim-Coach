import type { Practice } from "./types";
import type { RepHistoryEntry } from "./scoring";
import { scorePractice } from "./scoring";
import type { ScoringConfig } from "./types";
import { practiceEnergyFocus, practiceTotalDistance, type EnergyFocus } from "./practiceHelpers";

export type SortKey = "date" | "score" | "yardage" | "type";
export interface SortSpec {
  key: SortKey;
  dir: "asc" | "desc";
}

export const SORT_LABEL: Record<SortKey, string> = {
  date: "Date",
  score: "Score",
  yardage: "Yardage",
  type: "Type",
};

const TYPE_RANK: Record<EnergyFocus, number> = {
  aerobic: 0,
  threshold: 1,
  sprint: 2,
  lactate: 3,
  other: 4,
};

/** Adds/toggles/removes a sort key on tap: unselected -> desc -> asc -> removed. */
export function toggleSortSpec(specs: SortSpec[], key: SortKey): SortSpec[] {
  const idx = specs.findIndex((s) => s.key === key);
  if (idx === -1) return [...specs, { key, dir: "desc" }];
  if (specs[idx].dir === "desc") {
    const next = [...specs];
    next[idx] = { key, dir: "asc" };
    return next;
  }
  return specs.filter((s) => s.key !== key);
}

/** Sorts practices by the given specs in click order (first clicked = primary key). */
export function sortPractices(
  practices: Practice[],
  specs: SortSpec[],
  history: RepHistoryEntry[],
  config: ScoringConfig,
): Practice[] {
  if (specs.length === 0) return practices;

  const scoreById = new Map<string, number>();
  const distanceById = new Map<string, number>();
  const typeById = new Map<string, number>();
  for (const p of practices) {
    scoreById.set(p.id, scorePractice(p, history, config).practiceScore ?? -1);
    distanceById.set(p.id, practiceTotalDistance(p));
    typeById.set(p.id, TYPE_RANK[practiceEnergyFocus(p)]);
  }

  function valueFor(p: Practice, key: SortKey): number {
    if (key === "date") return new Date(p.date).getTime();
    if (key === "score") return scoreById.get(p.id) ?? -1;
    if (key === "yardage") return distanceById.get(p.id) ?? 0;
    return typeById.get(p.id) ?? 0;
  }

  return [...practices].sort((a, b) => {
    for (const spec of specs) {
      const diff = valueFor(a, spec.key) - valueFor(b, spec.key);
      if (diff !== 0) return spec.dir === "asc" ? diff : -diff;
    }
    return 0;
  });
}
