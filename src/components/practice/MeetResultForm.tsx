"use client";

import { useState } from "react";
import { db, newId } from "@/lib/db";
import { findOrCreateMeet, growMeetRange } from "@/lib/meets";
import { Field, Input, Select } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { formatTime, parseTime } from "@/lib/conversions";
import { todayISO } from "@/lib/format";
import { SWIM_EVENTS, eventLabel, type SwimEvent } from "@/lib/events";
import type { Course, Meet, MeetResult, MeetRound, SuitType } from "@/lib/types";

const COURSES: { label: string; value: Course }[] = [
  { label: "SCY", value: "SCY" },
  { label: "SCM", value: "SCM" },
  { label: "LCM", value: "LCM" },
];

const ROUNDS: { label: string; value: MeetRound }[] = [
  { label: "Timed final", value: "timed-final" },
  { label: "Prelim", value: "prelim" },
  { label: "Final", value: "final" },
];

/**
 * Logs (or edits) a MeetResult. Adding: pass either `meetId`+`meet` (adds
 * into that meet, growing its date range if needed) or nothing (shows a
 * meet-name field, found-or-created via findOrCreateMeet). Editing: pass
 * `initial` alongside `meetId`+`meet` to prefill and update in place.
 */
export function MeetResultForm({
  meetId,
  meet,
  defaultEvent,
  defaultCourse,
  initial,
  onCancel,
  onDone,
}: {
  meetId?: string;
  meet?: Meet;
  defaultEvent?: SwimEvent;
  defaultCourse?: Course;
  initial?: MeetResult;
  onCancel?: () => void;
  onDone: () => void;
}) {
  const [meetName, setMeetName] = useState("");
  const [event, setEvent] = useState<SwimEvent>(initial?.event ?? defaultEvent ?? SWIM_EVENTS[0]);
  const [course, setCourse] = useState<Course>(initial?.course ?? defaultCourse ?? "SCY");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [timeText, setTimeText] = useState(initial ? formatTime(initial.timeSeconds) : "");
  const [strokeCountText, setStrokeCountText] = useState(
    initial?.strokeCount != null ? String(initial.strokeCount) : "",
  );
  const [round, setRound] = useState<MeetRound>(initial?.round ?? "timed-final");
  const [suit, setSuit] = useState<SuitType>(initial?.suit ?? "tech");

  async function save() {
    const timeSeconds = parseTime(timeText);
    if (timeSeconds === null) return;
    if (!meetId && !initial && !meetName.trim()) return;

    const resolvedMeetId = initial?.meetId ?? meetId ?? (await findOrCreateMeet(meetName, date));
    if ((meetId || initial) && meet) await growMeetRange(meet, date);

    const result: MeetResult = {
      id: initial?.id ?? newId(),
      meetId: resolvedMeetId,
      date,
      event,
      course,
      timeSeconds,
      strokeCount: strokeCountText === "" ? null : Number(strokeCountText),
      round,
      suit,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    await db.meetResults.put(result);
    onDone();
  }

  return (
    <div className="w-full space-y-2 rounded-lg border border-dashed border-border p-2 text-left">
      {!meetId && !initial && (
        <Input
          placeholder="Meet name"
          value={meetName}
          onChange={(e) => setMeetName(e.target.value)}
        />
      )}
      <Field label="Event">
        <Select value={event} onChange={(e) => setEvent(e.target.value as SwimEvent)}>
          {SWIM_EVENTS.map((ev) => (
            <option key={ev} value={ev}>
              {eventLabel(ev, course)}
            </option>
          ))}
        </Select>
      </Field>
      <Segmented options={COURSES} value={course} onChange={setCourse} />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Time">
          <Input
            placeholder="1:02.35"
            value={timeText}
            onChange={(e) => setTimeText(e.target.value)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Strokes (optional)">
          <Input
            inputMode="numeric"
            placeholder="--"
            value={strokeCountText}
            onChange={(e) => setStrokeCountText(e.target.value)}
          />
        </Field>
        <Field label="Round">
          <Select value={round} onChange={(e) => setRound(e.target.value as MeetRound)}>
            {ROUNDS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Segmented
        options={[
          { label: "Tech suit", value: "tech" as SuitType },
          { label: "Practice suit", value: "practice" as SuitType },
        ]}
        value={suit}
        onChange={setSuit}
      />
      <div className="flex gap-2">
        {onCancel && (
          <Button variant="secondary" size="sm" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button size="sm" className="flex-1" onClick={save}>
          Save
        </Button>
      </div>
    </div>
  );
}
