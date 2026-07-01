import Dexie, { type Table } from "dexie";
import { DEFAULT_SCORING_CONFIG } from "./scoring";
import type {
  CalendarEvent,
  MeetResult,
  Practice,
  QualifyingStandard,
  ScoringConfig,
  SetTemplate,
  SwimmerProfile,
} from "./types";

class SwimCoachDB extends Dexie {
  practices!: Table<Practice, string>;
  setTemplates!: Table<SetTemplate, string>;
  calendarEvents!: Table<CalendarEvent, string>;
  standards!: Table<QualifyingStandard, string>;
  meetResults!: Table<MeetResult, string>;
  profile!: Table<SwimmerProfile, string>;
  scoringConfig!: Table<ScoringConfig, string>;

  constructor() {
    super("swim-coach");
    this.version(1).stores({
      practices: "id, date, course",
      setTemplates: "id, type, course",
      calendarEvents: "id, date, type, linkedPracticeId",
      standards: "id, event, course, gender",
      meetResults: "id, date, event, course",
      profile: "id",
      scoringConfig: "id",
    });
  }
}

export const db = new SwimCoachDB();

export function newId(): string {
  return crypto.randomUUID();
}

export const PROFILE_ID = "profile";
export const SCORING_CONFIG_ID = "scoring";

export const DEFAULT_PROFILE: SwimmerProfile = {
  id: PROFILE_ID,
  name: "",
  birthdate: null,
  gender: "M",
  goalEvents: ["50 Breast", "100 Breast"],
  createdAt: new Date(0).toISOString(),
};

/**
 * Creates the profile/scoring-config singleton rows if missing. Must be
 * called outside of a useLiveQuery querier — Dexie's liveQuery() runs
 * queriers in a readonly transaction, so writing inside one throws
 * ReadOnlyError. Call this once on app mount instead (see DbBootstrap).
 */
export async function ensureSingletons(): Promise<void> {
  const [profile, config] = await Promise.all([
    db.profile.get(PROFILE_ID),
    db.scoringConfig.get(SCORING_CONFIG_ID),
  ]);
  if (!profile) {
    await db.profile.put({ ...DEFAULT_PROFILE, createdAt: new Date().toISOString() });
  }
  if (!config) {
    await db.scoringConfig.put(DEFAULT_SCORING_CONFIG);
  }
}

/** Non-reactive lookups for use in event handlers (not inside useLiveQuery). */
export async function getProfile(): Promise<SwimmerProfile> {
  return (await db.profile.get(PROFILE_ID)) ?? DEFAULT_PROFILE;
}

export async function getScoringConfig(): Promise<ScoringConfig> {
  return (await db.scoringConfig.get(SCORING_CONFIG_ID)) ?? DEFAULT_SCORING_CONFIG;
}
