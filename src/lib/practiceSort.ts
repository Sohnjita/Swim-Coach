import type { EnergyFocus, Practice, ScoringConfig } from "./types";
import type { RepHistoryEntry } from "./scoring";
import { scorePractice } from "./scoring";
import { practiceTotalDistance } from "./practiceHelpers";

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
  technique: 4,
  other: 5,
};

/** Single active sort key: tapping a new key replaces it; tapping the active key flips
 * direction, and flips again back off (null) rather than stacking multiple keys. */
export function toggleSort(current: SortSpec | null, key: SortKey): SortSpec | null {
  if (!current || current.key !== key) return { key, dir: "desc" };
  if (current.dir === "desc") return { key, dir: "asc" };
  return null;
}

/** Sorts practices by a single spec (or leaves them in place if none is active). */
export function sortPractices(
  practices: Practice[],
  spec: SortSpec | null,
  history: RepHistoryEntry[],
  config: ScoringConfig,
): Practice[] {
  if (!spec) return practices;

  const scoreById = new Map<string, number>();
  const distanceById = new Map<string, number>();
  const typeById = new Map<string, number>();
  for (const p of practices) {
    scoreById.set(p.id, scorePractice(p, history, config).practiceScore ?? -1);
    distanceById.set(p.id, practiceTotalDistance(p));
    typeById.set(p.id, TYPE_RANK[p.focus ?? "aerobic"]);
  }

  function valueFor(p: Practice, key: SortKey): number {
    if (key === "date") return new Date(p.date).getTime();
    if (key === "score") return scoreById.get(p.id) ?? -1;
    if (key === "yardage") return distanceById.get(p.id) ?? 0;
    return typeById.get(p.id) ?? 0;
  }

  return [...practices].sort((a, b) => {
    const diff = valueFor(a, spec.key) - valueFor(b, spec.key);
    return spec.dir === "asc" ? diff : -diff;
  });
}
