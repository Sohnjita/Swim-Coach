// Breaststroke-only, v1 "training zone" Power Index: how a swimmer's actual
// practice pace in each of the four trainable set types (aerobic/threshold/
// sprint/lactate) compares to what the current world records at 50/100/200
// breast imply is required to top out in that zone. Deliberately separate
// from timesData.ts's meet-results-vs-Standards Power Index — this one reads
// practice reps, not meet results, and its reference point is a fixed world
// record rather than the swimmer's own logged Standards.
import { clamp } from "./scoring";
import type { Course, Practice, SetType } from "./types";

export type TrainingSetType = Exclude<SetType, "technique">;

export const TRAINING_SET_TYPES: TrainingSetType[] = ["aerobic", "threshold", "sprint", "lactate"];

export const TRAINING_SET_TYPE_LABEL: Record<TrainingSetType, string> = {
  aerobic: "Aerobic",
  threshold: "Threshold",
  sprint: "Sprint",
  lactate: "Lactate",
};

type BreastDistance = 50 | 100 | 200;
const BREAST_DISTANCES: BreastDistance[] = [50, 100, 200];

/**
 * Long-course world records, breaststroke only, as of mid-2026:
 * men's 50/100 — Adam Peaty (25.95 / 56.88); men's 200 — Qin Haiyang
 * (2:05.48); women's 50 — Ruta Meilutyte (29.16); women's 100 — Lilly King
 * (1:04.13); women's 200 — Evgeniia Chikunova (2:17.55). Update by hand as
 * records fall — there's no live feed for this.
 */
const WORLD_RECORD_LCM_SECONDS: Record<"M" | "F", Record<BreastDistance, number>> = {
  M: { 50: 25.95, 100: 56.88, 200: 125.48 },
  F: { 50: 29.16, 100: 64.13, 200: 137.55 },
};

// SCY/SCM→LCM turn/underwater-advantage estimates for breaststroke, extended
// from the same 50/100 figures used elsewhere in the app (see conversions.ts)
// out to 200 by extrapolating the same shrinking-with-distance trend. Fixed
// here rather than reusing the user's tunable ScoringConfig percentages —
// this feature is about positioning against a world reference, not the
// swimmer's own goal-projection tuning.
const SCY_TO_LCM_PERCENT: Record<BreastDistance, number> = { 50: 13, 100: 11, 200: 9 };
const SCM_TO_LCM_PERCENT: Record<BreastDistance, number> = { 50: 5, 100: 4, 200: 3 };

function toLcmSeconds(timeSeconds: number, course: Course, distance: BreastDistance): number {
  if (course === "LCM") return timeSeconds;
  const percent = course === "SCY" ? SCY_TO_LCM_PERCENT[distance] : SCM_TO_LCM_PERCENT[distance];
  return timeSeconds * (1 + percent / 100);
}

/**
 * How much each event's demand draws on each training zone — a coaching
 * heuristic, not a lab measurement. Grounded in the well-established
 * aerobic-vs-anaerobic-contribution-by-duration curve (roughly 30/70 at
 * 50m, 45/55 at 100m, 60/40 at 200m), with the anaerobic share further
 * split into alactic power ("sprint") vs. glycolytic tolerance ("lactate"),
 * and the aerobic share split into sustainable-hard ("threshold") vs. easy
 * base ("aerobic"). Each event's weights sum to 1.
 */
const EVENT_SET_TYPE_PRIORITY: Record<BreastDistance, Record<TrainingSetType, number>> = {
  50: { sprint: 0.55, lactate: 0.35, threshold: 0.07, aerobic: 0.03 },
  100: { sprint: 0.25, lactate: 0.45, threshold: 0.22, aerobic: 0.08 },
  200: { sprint: 0.08, lactate: 0.27, threshold: 0.4, aerobic: 0.25 },
};

/**
 * Typical %-off best-race-pace a swimmer actually swims within each zone —
 * negative means faster than race pace (short, well-rested reps need no
 * pacing strategy, so sprint work is often swum at or above race speed).
 */
const ZONE_PACE_OFFSET_PERCENT: Record<TrainingSetType, number> = {
  sprint: -2,
  lactate: 4,
  threshold: 12,
  aerobic: 30,
};

// Points lost per 1% slower than the zone's target pace. Deliberately much
// gentler than the meet-Standards reach formula (timesData.ts) — those
// compare against achievable program cuts, this compares against an actual
// world record, which almost nobody but an Olympic finalist sits within
// 10-15% of even in an "easy" zone. A low sensitivity keeps the chart
// readable (and able to show real week-to-week progress) across the whole
// realistic range instead of pinning everyone near zero.
const REACH_SENSITIVITY = 1.5;

/** Fastest LCM-equivalent breaststroke rep logged at `distance`, inside a block tagged `setType`. */
function bestZoneTime(
  practices: Practice[],
  setType: TrainingSetType,
  distance: BreastDistance,
): number | null {
  let best: number | null = null;
  for (const practice of practices) {
    for (const set of practice.sets) {
      if (set.type !== setType) continue;
      for (const rep of set.reps) {
        if (rep.stroke !== "breast" || rep.distance !== distance || rep.time === null) continue;
        const lcmTime = toLcmSeconds(rep.time, practice.course, distance);
        if (best === null || lcmTime < best) best = lcmTime;
      }
    }
  }
  return best;
}

/** 0-100 reach toward this zone's target pace at one event; null if nothing logged there yet. */
function zoneReachForEvent(
  practices: Practice[],
  gender: "M" | "F",
  setType: TrainingSetType,
  distance: BreastDistance,
): number | null {
  const best = bestZoneTime(practices, setType, distance);
  if (best === null) return null;
  const worldRecord = WORLD_RECORD_LCM_SECONDS[gender][distance];
  const targetPace = worldRecord * (1 + ZONE_PACE_OFFSET_PERCENT[setType] / 100);
  const percentSlower = ((best - targetPace) / targetPace) * 100;
  return clamp(100 - percentSlower * REACH_SENSITIVITY);
}

export interface TrainingZoneLevel {
  setType: TrainingSetType;
  level: number | null; // 0-100, null = no qualifying reps logged yet
}

/**
 * One vertex per training zone: the event-priority-weighted average of how
 * close the swimmer's best breaststroke pace in that zone is to the pace a
 * current world record implies is needed there. Events that barely draw on
 * a zone (e.g. the 50 barely touches "aerobic") barely move that zone's
 * score even if logged times are far off.
 */
export function trainingZoneLevels(practices: Practice[], gender: "M" | "F"): TrainingZoneLevel[] {
  return TRAINING_SET_TYPES.map((setType) => {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const distance of BREAST_DISTANCES) {
      const priority = EVENT_SET_TYPE_PRIORITY[distance][setType];
      const reach = zoneReachForEvent(practices, gender, setType, distance);
      if (reach === null) continue;
      weightedSum += reach * priority;
      totalWeight += priority;
    }
    return { setType, level: totalWeight > 0 ? weightedSum / totalWeight : null };
  });
}
