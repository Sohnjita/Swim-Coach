import type { Course, CutEvent, ScoringConfig } from "./types";

/**
 * Course/suit/start normalization.
 *
 * The SCY/SCM->LCM percentages below are editable estimates (see Settings),
 * not official published USA Swimming conversion factors — breaststroke has
 * no single authoritative short-course-to-long-course table because pullout
 * frequency (turns per race) skews the conversion more than for other strokes.
 * Defaults are reasonable starting points; tune them against your own data
 * once you have enough LCM vs SCY/SCM times logged for the same fitness window.
 */
export const DEFAULT_SCY_TO_LCM_PERCENT: Record<CutEvent, number> = {
  "50 Breast": 13,
  "100 Breast": 11,
};

export const DEFAULT_SCM_TO_LCM_PERCENT: Record<CutEvent, number> = {
  "50 Breast": 5,
  "100 Breast": 4,
};

export function eventForDistance(distance: number): CutEvent | null {
  if (distance === 50) return "50 Breast";
  if (distance === 100) return "100 Breast";
  return null;
}

/** Converts a raw time to its LCM-equivalent using the swimmer's configured percentages. */
export function toLcmEquivalent(
  timeSeconds: number,
  course: Course,
  event: CutEvent,
  config: ScoringConfig,
): number {
  if (course === "LCM") return timeSeconds;
  // "Other" pools are unusual/custom lengths — no dedicated conversion table,
  // so fall back to the SCM percentage as the closest available estimate.
  const percent =
    course === "SCY"
      ? config.scyToLcmPercent[event]
      : config.scmToLcmPercent[event];
  return timeSeconds * (1 + percent / 100);
}

/** Inverse of toLcmEquivalent — converts an LCM-equivalent time back down to a target course. */
export function fromLcmEquivalent(
  lcmTimeSeconds: number,
  course: Course,
  event: CutEvent,
  config: ScoringConfig,
): number {
  if (course === "LCM") return lcmTimeSeconds;
  const percent =
    course === "SCY"
      ? config.scyToLcmPercent[event]
      : config.scmToLcmPercent[event];
  return lcmTimeSeconds / (1 + percent / 100);
}

/** Adjusts a time to a common "practice suit, push start" baseline for fair comparison. */
export function normalizeToBaseline(
  timeSeconds: number,
  suit: "practice" | "tech",
  start: "push" | "dive",
  config: ScoringConfig,
): number {
  let normalized = timeSeconds;
  if (suit === "tech") {
    // Tech suit was faster than practice suit; add back the estimated drop
    // so the comparison reflects a practice-suit-equivalent effort.
    normalized = normalized * (1 + config.techSuitDropPercent / 100);
  }
  if (start === "dive") {
    normalized = normalized + config.diveAdvantageSeconds;
  }
  return normalized;
}

export function formatTime(seconds: number | null): string {
  if (seconds === null || Number.isNaN(seconds)) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = seconds - mins * 60;
  if (mins > 0) {
    return `${mins}:${secs.toFixed(2).padStart(5, "0")}`;
  }
  return secs.toFixed(2);
}

/** Parses "1:02.35", "62.35", or "62" into seconds. Returns null if unparseable. */
export function parseTime(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const [minPart, secPart] = trimmed.split(":");
    const mins = minPart === "" ? 0 : Number(minPart);
    const secs = Number(secPart);
    if (Number.isNaN(mins) || Number.isNaN(secs)) return null;
    return mins * 60 + secs;
  }
  const val = Number(trimmed);
  return Number.isNaN(val) ? null : val;
}

/** Formats send-off intervals as "1:30" or ":50" (no fractional seconds). */
export function formatInterval(seconds: number | null): string {
  if (seconds === null || Number.isNaN(seconds)) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds - mins * 60);
  if (mins > 0) return `${mins}:${String(secs).padStart(2, "0")}`;
  return `:${String(secs).padStart(2, "0")}`;
}

/** Parses "1:30", ":50", or "90" into whole seconds. Returns null if unparseable/empty. */
export function parseInterval(input: string): number | null {
  const seconds = parseTime(input);
  return seconds === null ? null : Math.round(seconds);
}
