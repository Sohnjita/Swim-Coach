import { newId } from "./db";
import { parseTime } from "./conversions";
import { SWIM_EVENTS, type SwimEvent } from "./events";
import type { QualifyingStandard } from "./types";

export function gapToCut(
  swimmerTimeSeconds: number,
  standard: QualifyingStandard,
): { deltaSeconds: number; percent: number; underCut: boolean } {
  const delta = swimmerTimeSeconds - standard.timeSeconds;
  return {
    deltaSeconds: delta,
    percent: (delta / standard.timeSeconds) * 100,
    underCut: delta <= 0,
  };
}

/**
 * No standards ship pre-loaded by default — the table starts empty, same as
 * it always has. USA Swimming doesn't publish a single machine-readable cuts
 * feed, and this app has no live data access to verify against one anyway.
 *
 * `buildStandardsSeed()` below is an opt-in starter set (see the "Load
 * starter cuts" action on /times/standards) built from general recollection
 * of Futures-level SCY standards, not a confirmed feed. Every row it
 * produces is marked `verified: false` and the UI keeps that flag visible
 * everywhere the standard appears — treat these as a rough starting point to
 * edit or delete, not as the official published cut.
 */
export const STANDARDS_SEED_MEET = "Futures Championships (illustrative, unverified)";

export const STANDARDS_SEED_DISCLAIMER =
  "These starter cuts are a best-effort estimate of Futures-level SCY standards, not a verified feed from USA Swimming. Confirm every time against the official published standard before relying on it — edit or delete anything here.";

// mm:ss.ss strings, parsed via parseTime. Illustrative Futures-tier SCY cuts.
const FUTURES_SCY_M: Record<SwimEvent, string> = {
  "free-50": "21.5",
  "free-100": "47.6",
  "free-200": "1:44.5",
  "free-400-500": "4:38.0",
  "free-800-1000": "9:48.0",
  "free-1500-1650": "16:25.0",
  "back-50": "24.0",
  "back-100": "51.5",
  "back-200": "1:53.0",
  "breast-50": "27.0",
  "breast-100": "1:00.0",
  "breast-200": "2:12.0",
  "fly-50": "23.0",
  "fly-100": "50.0",
  "fly-200": "1:53.5",
  "im-200": "1:56.0",
  "im-400": "4:10.0",
};

const FUTURES_SCY_F: Record<SwimEvent, string> = {
  "free-50": "24.0",
  "free-100": "52.5",
  "free-200": "1:53.5",
  "free-400-500": "5:02.0",
  "free-800-1000": "10:28.0",
  "free-1500-1650": "17:28.0",
  "back-50": "27.3",
  "back-100": "58.0",
  "back-200": "2:04.5",
  "breast-50": "30.5",
  "breast-100": "1:07.0",
  "breast-200": "2:24.0",
  "fly-50": "26.0",
  "fly-100": "55.5",
  "fly-200": "2:04.0",
  "im-200": "2:08.0",
  "im-400": "4:29.0",
};

function buildGenderSeed(gender: "M" | "F", table: Record<SwimEvent, string>): QualifyingStandard[] {
  return SWIM_EVENTS.map((event) => ({
    id: newId(),
    meet: STANDARDS_SEED_MEET,
    event,
    course: "SCY",
    gender,
    timeSeconds: parseTime(table[event]) ?? 0,
    verified: false,
  }));
}

export function buildStandardsSeed(): QualifyingStandard[] {
  return [...buildGenderSeed("M", FUTURES_SCY_M), ...buildGenderSeed("F", FUTURES_SCY_F)];
}
