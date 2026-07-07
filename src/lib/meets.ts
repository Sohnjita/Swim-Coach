import { db, newId } from "./db";
import type { Meet } from "./types";

/**
 * Finds an existing meet by case-insensitive name match and grows its date
 * range to cover `date` if needed, or creates a fresh single-day meet.
 * This is how multi-day meets happen in practice — logging a second day's
 * event under the same meet name just extends the range.
 */
export async function findOrCreateMeet(name: string, date: string): Promise<string> {
  const trimmed = name.trim();
  const existing = await db.meets
    .filter((m) => m.name.toLowerCase() === trimmed.toLowerCase())
    .first();

  if (existing) {
    await growMeetRange(existing, date);
    return existing.id;
  }

  const meet: Meet = {
    id: newId(),
    name: trimmed,
    startDate: date,
    endDate: date,
    createdAt: new Date().toISOString(),
  };
  await db.meets.put(meet);
  return meet.id;
}

/** Extends a meet's start/end date range to cover `date`, if it falls outside it. */
export async function growMeetRange(meet: Meet, date: string): Promise<void> {
  const startDate = date < meet.startDate ? date : meet.startDate;
  const endDate = date > meet.endDate ? date : meet.endDate;
  if (startDate !== meet.startDate || endDate !== meet.endDate) {
    await db.meets.update(meet.id, { startDate, endDate });
  }
}
