import type { CalendarEvent, EnergyFocus, Meet, MeetResult, Practice } from "./types";
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

export interface MeetGroup {
  meet: Meet;
  results: MeetResult[];
}

/** Groups meet results by meetId, joined against the Meet record for name/date range. */
export function groupMeetResults(results: MeetResult[], meets: Meet[]): MeetGroup[] {
  const meetsById = new Map(meets.map((m) => [m.id, m]));
  const byMeetId = new Map<string, MeetResult[]>();
  for (const r of results) {
    const list = byMeetId.get(r.meetId) ?? [];
    list.push(r);
    byMeetId.set(r.meetId, list);
  }
  const groups: MeetGroup[] = [];
  for (const [meetId, group] of byMeetId) {
    const meet = meetsById.get(meetId);
    if (!meet) continue;
    groups.push({ meet, results: [...group].sort((a, b) => a.date.localeCompare(b.date)) });
  }
  return groups;
}

export type TrainingItem =
  | {
      kind: "practice";
      date: string;
      practice: Practice;
      score: number | null;
      yardage: number;
      typeRank: number;
    }
  | { kind: "meet"; date: string; group: MeetGroup }
  | { kind: "lift"; date: string; lift: CalendarEvent };

/** Builds the unified list the Training tab filters and sorts. */
export function buildTrainingItems(
  practices: Practice[],
  meetGroups: MeetGroup[],
  lifts: CalendarEvent[],
): TrainingItem[] {
  const practiceItems: TrainingItem[] = practices.map((p) => ({
    kind: "practice",
    date: p.date,
    practice: p,
    score: p.practiceScore,
    yardage: practiceTotalDistance(p),
    typeRank: TYPE_RANK[p.focus ?? "aerobic"],
  }));
  const meetItems: TrainingItem[] = meetGroups.map((g) => ({
    kind: "meet",
    date: g.meet.startDate,
    group: g,
  }));
  const liftItems: TrainingItem[] = lifts.map((l) => ({ kind: "lift", date: l.date, lift: l }));
  return [...practiceItems, ...meetItems, ...liftItems];
}

function valueFor(item: TrainingItem, key: SortKey): number | null {
  if (key === "date") return new Date(item.date).getTime();
  if (item.kind !== "practice") return null;
  if (key === "score") return item.score;
  if (key === "yardage") return item.yardage;
  return item.typeRank;
}

/**
 * Sorts the unified Training list by one key. For score/yardage/type,
 * meets and lifts (which have no meaningful value for those keys) always
 * sort after every practice regardless of direction; everything is then
 * secondarily ordered by date, current first.
 */
export function sortTrainingItems(items: TrainingItem[], spec: SortSpec): TrainingItem[] {
  return [...items].sort((a, b) => {
    const av = valueFor(a, spec.key);
    const bv = valueFor(b, spec.key);
    if (av !== null && bv !== null && av !== bv) {
      const diff = av - bv;
      return spec.dir === "asc" ? diff : -diff;
    }
    if (av === null && bv !== null) return 1;
    if (av !== null && bv === null) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}
