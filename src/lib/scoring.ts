import type {
  Course,
  CutEvent,
  Practice,
  PracticeSet,
  Rep,
  ScoringConfig,
  SetType,
  Stroke,
} from "./types";
import {
  DEFAULT_SCM_TO_LCM_PERCENT,
  DEFAULT_SCY_TO_LCM_PERCENT,
  fromLcmEquivalent,
  normalizeToBaseline,
  toLcmEquivalent,
} from "./conversions";

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  id: "scoring",
  paceWeight: 0.6,
  efficiencyWeight: 0.25,
  effortWeight: 0.15,
  taperDropPercent: 2,
  techSuitDropPercent: 1.5,
  diveAdvantageSeconds: 0.3,
  scmToLcmPercent: DEFAULT_SCM_TO_LCM_PERCENT,
  scyToLcmPercent: DEFAULT_SCY_TO_LCM_PERCENT,
};

// Internal sensitivity constants (not user-tunable — the weights/taper/suit
// numbers above are the meaningful knobs exposed in Settings).
const PACE_SENSITIVITY = 10; // points lost per 1% slower than best-equivalent
const EFFICIENCY_SENSITIVITY = 8; // points lost per 1% worse SWOLF than best
const EFFORT_RPE_SENSITIVITY = 5; // points shifted per RPE point away from 5
// Seconds of comparison-time credit given per second of rest *less* than
// this rep shape's historical average (or, for projections, per second
// less rest than a historical entry's own interval) — a rough stand-in for
// "swimming a similar time on a tighter interval is a harder effort."
const INTERVAL_TIME_CREDIT = 0.03;
// Recency weighting for goal projections: each older sample (by date, most
// recent first) counts for this much less than the one before it.
const RECENCY_DECAY = 0.8;

const SET_TYPE_WEIGHT: Record<SetType, number> = {
  lactate: 1.2,
  sprint: 1.2,
  threshold: 1.0,
  aerobic: 0.8,
  technique: 0.6,
};

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/** Race events (50/100 breast) get cross-course comparison via LCM-equivalent time. */
function isRaceEvent(distance: number, stroke: Stroke): stroke is "breast" {
  return stroke === "breast" && (distance === 50 || distance === 100);
}

/**
 * Grouping key used to find "what's the best I've done at this exact rep
 * shape" — distance/stroke/course plus the line's descriptor tag (e.g.
 * "best avg", "descend 1-4"), so history comparisons don't pool an all-out
 * effort together with an easy swim of the same distance/stroke.
 */
export function repComparisonKey(
  distance: number,
  stroke: Stroke,
  course: Course,
  tag: string | null,
): string {
  const base = isRaceEvent(distance, stroke) ? `race-${distance}-breast` : `${distance}-${stroke}-${course}`;
  return tag ? `${base}::${tag}` : base;
}

/** Normalizes a rep's raw time to a comparable baseline (practice suit, push, LCM if a race event). */
export function normalizedRepTime(
  rep: Rep,
  course: Course,
  config: ScoringConfig,
): number | null {
  if (rep.time === null) return null;
  const baseline = normalizeToBaseline(rep.time, rep.suit, rep.start, config);
  if (isRaceEvent(rep.distance, rep.stroke)) {
    const event: CutEvent = rep.distance === 50 ? "50 Breast" : "100 Breast";
    return toLcmEquivalent(baseline, course, event, config);
  }
  return baseline;
}

export interface RepHistoryEntry {
  key: string;
  normalizedTime: number;
  time: number; // raw logged seconds, for interval/rest comparisons
  intervalSeconds: number | null;
  swolf: number | null; // time + strokeCount, same units as logged
  date: string;
}

export interface ScoredRep {
  repId: string;
  normalizedTime: number | null;
  paceScore: number | null;
  efficiencyScore: number | null;
  effortScore: number | null;
  compositeScore: number | null;
}

/**
 * Scores a single rep against the swimmer's own history at that same
 * distance/stroke/course/descriptor-tag shape (or LCM-equivalent history
 * for the two goal race events). `history` should exclude the rep being
 * scored.
 *
 * Pace is interval-aware: a rep swum on a materially tighter interval than
 * this shape's historical average gets a small time credit before being
 * compared to the historical best, and a rep on a more generous interval
 * gets a small penalty — so a slightly slower time on a much harder
 * interval doesn't register as a flat regression.
 */
export function scoreRep(
  rep: Rep,
  course: Course,
  history: RepHistoryEntry[],
  config: ScoringConfig,
): ScoredRep {
  const normalizedTime = normalizedRepTime(rep, course, config);
  if (normalizedTime === null) {
    return {
      repId: rep.id,
      normalizedTime: null,
      paceScore: null,
      efficiencyScore: null,
      effortScore: null,
      compositeScore: null,
    };
  }

  const tag = rep.notes ?? null;
  const key = repComparisonKey(rep.distance, rep.stroke, course, tag);
  const keyHistory = history.filter((h) => h.key === key);

  const bestTime = keyHistory.length
    ? Math.min(normalizedTime, ...keyHistory.map((h) => h.normalizedTime))
    : normalizedTime;

  let comparisonTime = normalizedTime;
  if (rep.restIntervalSeconds !== null && rep.time !== null) {
    const historicalRests = keyHistory
      .filter((h) => h.intervalSeconds !== null)
      .map((h) => h.intervalSeconds! - h.time);
    if (historicalRests.length > 0) {
      const avgHistoricalRest =
        historicalRests.reduce((sum, r) => sum + r, 0) / historicalRests.length;
      const restObtained = rep.restIntervalSeconds - rep.time;
      const restDelta = avgHistoricalRest - restObtained;
      comparisonTime = normalizedTime - restDelta * INTERVAL_TIME_CREDIT;
    }
  }

  const percentSlower = ((comparisonTime - bestTime) / bestTime) * 100;
  const paceScore = clamp(100 - percentSlower * PACE_SENSITIVITY);

  let efficiencyScore: number | null = null;
  if (rep.strokeCount !== null) {
    const swolf = rep.time !== null ? rep.time + rep.strokeCount : null;
    const swolfHistory = keyHistory
      .map((h) => h.swolf)
      .filter((s): s is number => s !== null);
    if (swolf !== null) {
      const bestSwolf = swolfHistory.length
        ? Math.min(swolf, ...swolfHistory)
        : swolf;
      const percentWorse = ((swolf - bestSwolf) / bestSwolf) * 100;
      efficiencyScore = clamp(100 - percentWorse * EFFICIENCY_SENSITIVITY);
    }
  }

  let effortScore: number | null = null;
  if (rep.rpe !== null) {
    effortScore = clamp(paceScore - (rep.rpe - 5) * EFFORT_RPE_SENSITIVITY);
  }

  const parts: { score: number; weight: number }[] = [
    { score: paceScore, weight: config.paceWeight },
  ];
  if (efficiencyScore !== null)
    parts.push({ score: efficiencyScore, weight: config.efficiencyWeight });
  if (effortScore !== null)
    parts.push({ score: effortScore, weight: config.effortWeight });

  const totalWeight = parts.reduce((sum, p) => sum + p.weight, 0);
  const compositeScore =
    totalWeight > 0
      ? parts.reduce((sum, p) => sum + p.score * p.weight, 0) / totalWeight
      : paceScore;

  return {
    repId: rep.id,
    normalizedTime,
    paceScore,
    efficiencyScore,
    effortScore,
    compositeScore: clamp(compositeScore),
  };
}

export function scoreSet(
  set: PracticeSet,
  course: Course,
  history: RepHistoryEntry[],
  config: ScoringConfig,
): { repScores: ScoredRep[]; setScore: number | null } {
  const repScores = set.reps.map((rep) => scoreRep(rep, course, history, config));
  const scored = repScores.filter(
    (r): r is ScoredRep & { compositeScore: number } => r.compositeScore !== null,
  );
  const setScore = scored.length
    ? scored.reduce((sum, r) => sum + r.compositeScore, 0) / scored.length
    : null;
  return { repScores, setScore };
}

export interface ScoredPractice {
  setScores: { setId: string; type: SetType; score: number | null }[];
  practiceScore: number | null;
}

export function scorePractice(
  practice: Practice,
  history: RepHistoryEntry[],
  config: ScoringConfig,
): ScoredPractice {
  const setScores = practice.sets.map((set) => {
    const { setScore } = scoreSet(set, practice.course, history, config);
    return { setId: set.id, type: set.type, score: setScore };
  });

  const weighted = setScores.filter(
    (s): s is { setId: string; type: SetType; score: number } => s.score !== null,
  );
  const totalWeight = weighted.reduce(
    (sum, s) => sum + SET_TYPE_WEIGHT[s.type],
    0,
  );
  const practiceScore = totalWeight
    ? weighted.reduce((sum, s) => sum + s.score * SET_TYPE_WEIGHT[s.type], 0) /
      totalWeight
    : null;

  return { setScores, practiceScore };
}

/** Builds the RepHistoryEntry[] scoring needs from a swimmer's full practice history. */
export function buildRepHistory(
  practices: Practice[],
  config: ScoringConfig,
): RepHistoryEntry[] {
  const entries: RepHistoryEntry[] = [];
  for (const practice of practices) {
    for (const set of practice.sets) {
      for (const rep of set.reps) {
        const normalizedTime = normalizedRepTime(rep, practice.course, config);
        if (normalizedTime === null) continue;
        const swolf =
          rep.time !== null && rep.strokeCount !== null
            ? rep.time + rep.strokeCount
            : null;
        entries.push({
          key: repComparisonKey(rep.distance, rep.stroke, practice.course, rep.notes ?? null),
          normalizedTime,
          time: rep.time!,
          intervalSeconds: rep.restIntervalSeconds,
          swolf,
          date: practice.date,
        });
      }
    }
  }
  return entries;
}

export interface RepShape {
  distance: number;
  stroke: Stroke;
  course: Course;
  tag: string | null;
  intervalSeconds: number | null;
}

export interface RepProjection {
  projectedSeconds: number | null;
  sampleCount: number;
  bestSeconds: number | null;
  mostRecentDate: string | null;
}

/**
 * On-demand "what would I likely go" projection for a rep shape you haven't
 * swum yet — e.g. while writing a set's notation, before practice. Pulls
 * every historical rep sharing the same distance/stroke/course/tag
 * signature, adjusts each to the *target* interval using the same rest-
 * credit heuristic as scoreRep (so a history of :55 and 1:05 swims still
 * informs a 1:00 projection, not just exact-interval matches), then blends
 * the best adjusted time with a recency-weighted average.
 */
export function projectRepTime(
  shape: RepShape,
  history: RepHistoryEntry[],
  config: ScoringConfig,
): RepProjection {
  const key = repComparisonKey(shape.distance, shape.stroke, shape.course, shape.tag);
  const matches = history
    .filter((h) => h.key === key)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (matches.length === 0) {
    return { projectedSeconds: null, sampleCount: 0, bestSeconds: null, mostRecentDate: null };
  }

  // Base the projection on each match's baseline-normalized time (already
  // suit/start-adjusted when history was built), then layer the same
  // rest-credit heuristic scoreRep uses, aimed at the target interval.
  const adjusted = matches.map((m) => {
    if (shape.intervalSeconds === null || m.intervalSeconds === null) return m.normalizedTime;
    const restDeltaToTarget = m.intervalSeconds - shape.intervalSeconds;
    return m.normalizedTime + restDeltaToTarget * INTERVAL_TIME_CREDIT;
  });

  const bestAdjusted = Math.min(...adjusted);
  let weightedSum = 0;
  let totalWeight = 0;
  adjusted.forEach((time, i) => {
    const weight = RECENCY_DECAY ** i;
    weightedSum += time * weight;
    totalWeight += weight;
  });
  const recencyWeightedAvg = weightedSum / totalWeight;
  const projectedInComparisonSpace = 0.5 * bestAdjusted + 0.5 * recencyWeightedAvg;

  // The two legacy race events pool history across courses via an
  // LCM-equivalent comparison space (see normalizedRepTime) — convert the
  // blended projection back down to the shape's actual course so it reads
  // as a real time on that pool, not an inflated LCM-equivalent number.
  const projectedSeconds = isRaceEvent(shape.distance, shape.stroke)
    ? fromLcmEquivalent(
        projectedInComparisonSpace,
        shape.course,
        shape.distance === 50 ? "50 Breast" : "100 Breast",
        config,
      )
    : projectedInComparisonSpace;

  return {
    projectedSeconds,
    sampleCount: matches.length,
    bestSeconds: Math.min(...matches.map((m) => m.time)),
    mostRecentDate: matches[0].date,
  };
}

export interface GoalPrediction {
  event: CutEvent;
  bestEquivalentSeconds: number | null;
  predictedTaperedSeconds: number | null;
  basedOnDate: string | null;
}

/**
 * Predicts a tapered meet time for 50/100 breast from the best sprint/lactate
 * rep effort on record, LCM-normalized, minus the configured taper drop.
 * This is a heuristic, not a statistical model — treat it as a starting
 * point for goal-setting, not a guarantee.
 */
export function predictGoalTimes(
  practices: Practice[],
  config: ScoringConfig,
): GoalPrediction[] {
  const events: CutEvent[] = ["50 Breast", "100 Breast"];
  return events.map((event) => {
    const distance = event === "50 Breast" ? 50 : 100;
    let best: { time: number; date: string } | null = null;
    for (const practice of practices) {
      for (const set of practice.sets) {
        if (set.type !== "sprint" && set.type !== "lactate") continue;
        for (const rep of set.reps) {
          if (rep.stroke !== "breast" || rep.distance !== distance) continue;
          const normalized = normalizedRepTime(rep, practice.course, config);
          if (normalized === null) continue;
          if (!best || normalized < best.time) {
            best = { time: normalized, date: practice.date };
          }
        }
      }
    }
    return {
      event,
      bestEquivalentSeconds: best?.time ?? null,
      predictedTaperedSeconds: best
        ? best.time * (1 - config.taperDropPercent / 100)
        : null,
      basedOnDate: best?.date ?? null,
    };
  });
}
