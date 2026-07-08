// Core domain model for Swim Coach.
// Times are always stored in whole seconds (number, e.g. 61.42 for 1:01.42).

import type { SwimEvent } from "./events";

export type Stroke =
  | "free"
  | "back"
  | "breast"
  | "fly"
  | "im"
  | "kick"
  | "drill";

export type Course = "SCY" | "SCM" | "LCM" | "Other";

export type SetType = "aerobic" | "threshold" | "sprint" | "lactate" | "technique";

/** A practice's overall energy-system focus — set by the swimmer, not derived. */
export type EnergyFocus = SetType | "other";

export type StartType = "push" | "dive";

export type SuitType = "practice" | "tech";

/** One repeat within a set, e.g. the 3rd 100 of an 8x100. */
export interface Rep {
  id: string;
  repIndex: number;
  distance: number; // meters or yards, matches the practice's course unit
  stroke: Stroke;
  time: number | null; // seconds, null if not timed/recorded
  strokeCount: number | null;
  restIntervalSeconds: number | null; // interval given (send-off), not just rest
  rpe: number | null; // 1-10
  start: StartType;
  suit: SuitType;
  notes?: string;
  // Snapshotted composite score as of the last time this practice was
  // saved — not recomputed live, so a rep's score stays fixed once you
  // stop editing that practice, even as more history is logged elsewhere.
  score: number | null;
}

export type LineModifier = "swim" | "kick" | "drill" | "pull";

/** A single "3x100 on 1:30 breast" style line within a block's notation. */
export interface RepGroupLine {
  kind: "reps";
  id: string;
  count: number;
  distance: number;
  intervalSeconds: number | null;
  stroke?: Stroke; // omit to leave unspecified — note it in tag instead
  modifier: LineModifier;
  tag?: string; // free text like "ez", "build", "DPS", "descend 1-4"
}

/** A free-form annotation line, e.g. "Odds: free breathe every 5". */
export interface TextLine {
  kind: "text";
  id: string;
  text: string;
}

/** A repeated group, e.g. 2x[ ... ]. */
export interface RoundLine {
  kind: "round";
  id: string;
  multiplier: number;
  items: PracticeLine[];
}

export type PracticeLine = RepGroupLine | TextLine | RoundLine;

/** A labeled block of notation (e.g. "Main") that expands into loggable reps. */
export interface PracticeSet {
  id: string;
  type: SetType;
  label: string; // e.g. "Main"
  lines: PracticeLine[]; // the notation as written
  reps: Rep[]; // generated from lines, actually logged (time/strokeCount/RPE)
  notes?: string;
  // Snapshotted as of the last save — see Rep.score.
  setScore: number | null;
}

export interface Practice {
  id: string;
  date: string; // ISO date (yyyy-mm-dd)
  course: Course;
  customPoolLengthMeters: number | null; // set when course === "Other"
  focus: EnergyFocus; // swimmer-chosen, not auto-classified from set types
  sets: PracticeSet[];
  // Context factors, logged once per practice
  sleepHours: number | null;
  bodyWeightLbs: number | null;
  gymThatDay: boolean;
  overallRpe: number | null;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Snapshotted as of the last save — see Rep.score.
  practiceScore: number | null;
}

/** A reusable set template a swimmer can pull into a new practice. */
export interface SetTemplate {
  id: string;
  type: SetType;
  label: string;
  course: Course;
  lines: PracticeLine[]; // written line-by-line, same as a practice block
  notes?: string;
  createdAt: string;
}

export type CalendarEventType =
  | "swim"
  | "lift"
  | "meal"
  | "sleep"
  | "meet";

export interface CalendarEvent {
  id: string;
  date: string; // ISO date
  type: CalendarEventType;
  title: string;
  startTime?: string; // HH:mm
  durationMinutes?: number;
  notes?: string;
  linkedPracticeId?: string; // for "swim" events completed as a Practice
  completed: boolean;
}

export type CutEvent = "50 Breast" | "100 Breast";

export interface QualifyingStandard {
  id: string;
  meet: string; // e.g. "2026 Futures Championships"
  event: SwimEvent;
  course: Course;
  gender: "M" | "F";
  timeSeconds: number;
  verified: boolean; // false for seeded starter cuts pending confirmation
}

export interface Meet {
  id: string;
  name: string;
  startDate: string; // ISO date
  endDate: string; // ISO date; equals startDate for single-day meets
  createdAt: string;
}

export type MeetRound = "timed-final" | "prelim" | "final";

export interface MeetResult {
  id: string;
  meetId: string;
  date: string; // which day of the meet this swim happened
  event: SwimEvent;
  course: Course;
  timeSeconds: number;
  strokeCount: number | null;
  round: MeetRound;
  suit: SuitType;
  notes?: string;
  createdAt: string;
}

export interface SwimmerProfile {
  id: string; // fixed singleton id "profile"
  name: string;
  birthdate: string | null;
  gender: "M" | "F";
  goalEvents: CutEvent[];
  createdAt: string;
}

/** Tunable weights/constants behind the scoring engine, editable in Settings. */
export interface ScoringConfig {
  id: string; // fixed singleton id "scoring"
  paceWeight: number; // 0-1
  efficiencyWeight: number; // 0-1
  effortWeight: number; // 0-1
  taperDropPercent: number; // expected improvement from best practice effort to tapered meet swim
  techSuitDropPercent: number; // expected time drop from practice suit to tech suit
  diveAdvantageSeconds: number; // flat seconds saved for a dive start vs push, per rep
  scmToLcmPercent: Record<CutEvent, number>; // % slower in LCM vs SCM (turns advantage lost)
  scyToLcmPercent: Record<CutEvent, number>; // % slower in LCM vs SCY
}
