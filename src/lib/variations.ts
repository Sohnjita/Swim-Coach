import type { Course, SetType, Stroke } from "./types";
import { repComparisonKey, type RepHistoryEntry } from "./scoring";
import { formatTime } from "./conversions";

export type Trend = "improving" | "steady" | "declining" | "insufficient-data";

export interface SetVariationSuggestion {
  trend: Trend;
  suggestedIntervalSeconds: number | null;
  suggestedTargetSeconds: number | null;
  rationale: string;
}

/** The single rep shape a variation suggestion is computed against. */
export interface RepShape {
  distance: number;
  stroke: Stroke;
  course: Course;
  setType: SetType;
  baseIntervalSeconds: number | null;
}

/**
 * Suggests an interval/target-pace variation for one rep shape (typically a
 * saved template's first written line) by comparing your most recent reps at
 * that same distance/stroke/course against the reps before them. This is a
 * simple recency-trend heuristic, not a physiological model — treat the
 * rationale as a prompt to adjust, not a guarantee.
 */
export function suggestSetVariation(
  shape: RepShape,
  history: RepHistoryEntry[],
): SetVariationSuggestion {
  const key = repComparisonKey(shape.distance, shape.stroke, shape.course, shape.setType);
  const matches = history
    .filter((h) => h.key === key)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (matches.length < 4) {
    return {
      trend: "insufficient-data",
      suggestedIntervalSeconds: shape.baseIntervalSeconds,
      suggestedTargetSeconds: matches.length
        ? Math.min(...matches.map((m) => m.normalizedTime))
        : null,
      rationale: `Log a few more ${shape.distance} ${shape.stroke} reps at this shape before I can suggest a variation — need at least 4, have ${matches.length}.`,
    };
  }

  const windowSize = Math.min(5, Math.floor(matches.length / 2));
  const recent = matches.slice(-windowSize);
  const prior = matches.slice(-windowSize * 2, -windowSize);
  const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;

  const recentAvg = avg(recent.map((m) => m.normalizedTime));
  const priorAvg = prior.length ? avg(prior.map((m) => m.normalizedTime)) : recentAvg;
  const pctChange = ((recentAvg - priorAvg) / priorAvg) * 100;
  const bestRecent = Math.min(...recent.map((m) => m.normalizedTime));
  const baseInterval = shape.baseIntervalSeconds;

  if (pctChange < -0.5) {
    const interval = baseInterval ? Math.round(baseInterval * 0.98) : null;
    const target = bestRecent * 0.995;
    return {
      trend: "improving",
      suggestedIntervalSeconds: interval,
      suggestedTargetSeconds: target,
      rationale: `Your last ${windowSize} reps at this shape are ${Math.abs(pctChange).toFixed(1)}% faster than the ${windowSize} before them. Try tightening the interval${interval ? ` to :${interval}` : ""} and targeting ${formatTime(target)}.`,
    };
  }
  if (pctChange > 1.5) {
    const interval = baseInterval ? Math.round(baseInterval * 1.03) : null;
    const target = bestRecent * 1.01;
    return {
      trend: "declining",
      suggestedIntervalSeconds: interval,
      suggestedTargetSeconds: target,
      rationale: `Times have slipped ${pctChange.toFixed(1)}% over your last ${windowSize} reps. Ease the interval${interval ? ` to :${interval}` : ""} and rebuild consistency near ${formatTime(target)} before pushing pace again.`,
    };
  }
  return {
    trend: "steady",
    suggestedIntervalSeconds: baseInterval,
    suggestedTargetSeconds: bestRecent,
    rationale: `Performance has been steady over your last ${windowSize} reps. Hold your usual interval and aim to match your recent best of ${formatTime(bestRecent)}.`,
  };
}
