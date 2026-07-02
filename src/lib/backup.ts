// Full local-data backup/restore — the app is local-first (IndexedDB only),
// so this is the only way to move data between devices or recover from a
// cleared browser profile.

import { db } from "./db";
import type {
  CalendarEvent,
  MeetResult,
  Practice,
  QualifyingStandard,
  ScoringConfig,
  SetTemplate,
  SwimmerProfile,
} from "./types";

export const BACKUP_VERSION = 1;

export interface BackupPayload {
  version: number;
  exportedAt: string;
  practices: Practice[];
  setTemplates: SetTemplate[];
  calendarEvents: CalendarEvent[];
  standards: QualifyingStandard[];
  meetResults: MeetResult[];
  profile: SwimmerProfile[];
  scoringConfig: ScoringConfig[];
}

export async function buildBackup(): Promise<BackupPayload> {
  const [practices, setTemplates, calendarEvents, standards, meetResults, profile, scoringConfig] =
    await Promise.all([
      db.practices.toArray(),
      db.setTemplates.toArray(),
      db.calendarEvents.toArray(),
      db.standards.toArray(),
      db.meetResults.toArray(),
      db.profile.toArray(),
      db.scoringConfig.toArray(),
    ]);
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    practices,
    setTemplates,
    calendarEvents,
    standards,
    meetResults,
    profile,
    scoringConfig,
  };
}

export function downloadBackup(payload: BackupPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `swim-coach-backup-${payload.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function isBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.practices) &&
    Array.isArray(v.setTemplates) &&
    Array.isArray(v.calendarEvents) &&
    Array.isArray(v.standards) &&
    Array.isArray(v.meetResults) &&
    Array.isArray(v.profile) &&
    Array.isArray(v.scoringConfig)
  );
}

export function parseBackupFile(json: string): BackupPayload {
  const parsed: unknown = JSON.parse(json);
  if (!isBackupPayload(parsed)) {
    throw new Error("This file doesn't look like a Swim Coach backup.");
  }
  return parsed;
}

/**
 * Upserts every record from a backup into the local database — existing
 * records with a matching id are overwritten, everything else is left alone.
 */
export async function restoreBackup(payload: BackupPayload): Promise<void> {
  await db.transaction(
    "rw",
    [
      db.practices,
      db.setTemplates,
      db.calendarEvents,
      db.standards,
      db.meetResults,
      db.profile,
      db.scoringConfig,
    ],
    async () => {
      await Promise.all([
        db.practices.bulkPut(payload.practices),
        db.setTemplates.bulkPut(payload.setTemplates),
        db.calendarEvents.bulkPut(payload.calendarEvents),
        db.standards.bulkPut(payload.standards),
        db.meetResults.bulkPut(payload.meetResults),
        db.profile.bulkPut(payload.profile),
        db.scoringConfig.bulkPut(payload.scoringConfig),
      ]);
    },
  );
}
