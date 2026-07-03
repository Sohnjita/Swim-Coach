// Parses whole practices (header fields + one or more labeled blocks) from
// pasted text, for importing practices logged elsewhere. See the placeholder
// text in the import UI for the exact format this expects.

import { newId } from "./db";
import { expandLinesToReps } from "./lineTree";
import { isNotationSetLine, parseNotationText } from "./notationParser";
import { todayISO } from "./format";
import type { Course, Practice, PracticeSet, SetType } from "./types";

const SET_TYPES: SetType[] = ["aerobic", "threshold", "sprint", "lactate"];
const COURSES: Course[] = ["SCY", "SCM", "LCM"];

function parseHeaderLine(raw: string): { key: string; value: string } | null {
  const m = raw.match(/^([A-Za-z ]+):\s*(.*)$/);
  if (!m) return null;
  return { key: m[1].trim().toLowerCase(), value: m[2].trim() };
}

function parseBlockHeader(line: string): { label: string; type: SetType } | null {
  const m = line.match(/^([^(:]+?)\s*(?:\((\w+)\))?\s*:?\s*$/);
  if (!m) return null;
  const label = m[1].trim();
  if (!label) return null;
  const typeRaw = (m[2] ?? "").toLowerCase() as SetType;
  const type = SET_TYPES.includes(typeRaw) ? typeRaw : "aerobic";
  return { label, type };
}

/** Parses a single practice (header fields + blank-line-delimited blocks) from text. */
export function parsePracticeText(text: string): Practice {
  const lines = text.split("\n").map((l) => l.trim());

  let i = 0;
  const headers: Record<string, string> = {};
  while (i < lines.length && lines[i] !== "") {
    const parsed = parseHeaderLine(lines[i]);
    if (!parsed) break;
    headers[parsed.key] = parsed.value;
    i++;
  }

  const date = headers.date || todayISO();
  const courseRaw = (headers.course || "").toUpperCase();
  const course: Course = COURSES.includes(courseRaw as Course) ? (courseRaw as Course) : "SCY";
  const sleepHours = headers.sleep ? Number(headers.sleep) : null;
  const bodyWeightKg = headers.weight ? Number(headers.weight) : null;
  const overallRpe = headers.rpe ? Number(headers.rpe) : null;
  const gymThatDay = /^(y|yes|true)$/i.test(headers.gym ?? "");
  const notes = headers.notes || undefined;

  const chunks: string[][] = [];
  let current: string[] = [];
  for (const line of lines.slice(i)) {
    if (line === "") {
      if (current.length) chunks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) chunks.push(current);

  const sets: PracticeSet[] = chunks.map((chunk, idx) => {
    let label = `Block ${idx + 1}`;
    let type: SetType = "aerobic";
    let body = chunk;
    if (!isNotationSetLine(chunk[0])) {
      const header = parseBlockHeader(chunk[0]);
      if (header) {
        label = header.label;
        type = header.type;
        body = chunk.slice(1);
      }
    }
    const linesTree = parseNotationText(body.join("\n"));
    return {
      id: newId(),
      type,
      label,
      lines: linesTree,
      reps: expandLinesToReps(linesTree, "push", "practice"),
    };
  });

  const now = new Date().toISOString();
  return {
    id: newId(),
    date,
    course,
    customPoolLengthMeters: null,
    sets,
    sleepHours,
    bodyWeightKg,
    gymThatDay,
    overallRpe,
    notes,
    createdAt: now,
    updatedAt: now,
  };
}

/** Splits a pasted blob on lines containing only 3+ dashes, then parses each chunk. */
export function parseBatchPracticeText(text: string): Practice[] {
  return text
    .split(/\n[ \t]*-{3,}[ \t]*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map(parsePracticeText)
    .filter((p) => p.sets.some((s) => s.lines.length > 0));
}
