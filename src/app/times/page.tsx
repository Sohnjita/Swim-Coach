"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Settings2 } from "lucide-react";
import { db, DEFAULT_PROFILE, newId, PROFILE_ID } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Segmented } from "@/components/ui/Segmented";
import { Field, Input } from "@/components/ui/Field";
import { formatTime, parseTime } from "@/lib/conversions";
import { formatDateLabel, todayISO } from "@/lib/format";
import { gapToCut } from "@/lib/standards";
import { SWIM_EVENTS, eventLabel, type SwimEvent } from "@/lib/events";
import {
  achievedStandards,
  bestMeetResult,
  bestPracticeTimes,
  standardsForEvent,
  type BestPracticeTime,
} from "@/lib/timesData";
import type { Course, MeetResult, Practice, QualifyingStandard, SuitType } from "@/lib/types";

const COURSES: { label: string; value: Course }[] = [
  { label: "SCY", value: "SCY" },
  { label: "SCM", value: "SCM" },
  { label: "LCM", value: "LCM" },
];

const SUIT_START_LABEL: Record<string, string> = {
  "practice-push": "Practice suit · Push",
  "practice-dive": "Practice suit · Dive",
  "tech-push": "Tech suit · Push",
  "tech-dive": "Tech suit · Dive",
};

export default function TimesPage() {
  const [course, setCourse] = useState<Course>("SCY");
  const [expanded, setExpanded] = useState<SwimEvent | null>(null);

  const results = useLiveQuery(() => db.meetResults.toArray(), []) ?? [];
  const standards = useLiveQuery(() => db.standards.toArray(), []) ?? [];
  const practices = useLiveQuery(() => db.practices.toArray(), []) ?? [];
  const profile = useLiveQuery(() => db.profile.get(PROFILE_ID), []) ?? DEFAULT_PROFILE;

  return (
    <div>
      <PageHeader
        title="Times"
        action={
          <Link href="/times/standards">
            <Button variant="ghost" size="icon" aria-label="Manage standards">
              <Settings2 size={20} />
            </Button>
          </Link>
        }
      />
      <div className="p-4">
        <div className="mb-4 flex justify-center">
          <Segmented options={COURSES} value={course} onChange={setCourse} />
        </div>

        <div className="mx-auto max-w-sm divide-y divide-border/40">
          {SWIM_EVENTS.map((event) => (
            <EventRow
              key={event}
              event={event}
              course={course}
              gender={profile.gender}
              expanded={expanded === event}
              onToggle={() => setExpanded((cur) => (cur === event ? null : event))}
              results={results}
              standards={standards}
              practices={practices}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EventRow({
  event,
  course,
  gender,
  expanded,
  onToggle,
  results,
  standards,
  practices,
}: {
  event: SwimEvent;
  course: Course;
  gender: "M" | "F";
  expanded: boolean;
  onToggle: () => void;
  results: MeetResult[];
  standards: QualifyingStandard[];
  practices: Practice[];
}) {
  const [showAddResult, setShowAddResult] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);

  const pb = bestMeetResult(results, event, course);
  const achieved = pb ? achievedStandards(standards, event, course, gender, pb.timeSeconds) : [];
  const allStandards = standardsForEvent(standards, event, course, gender);
  const nextCut = allStandards.find((s) => !achieved.some((a) => a.id === s.id));
  const practiceBests = bestPracticeTimes(practices, event, course);
  const eventResults = results
    .filter((r) => r.event === event && r.course === course)
    .sort((a, b) => a.timeSeconds - b.timeSeconds);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col items-center gap-0.5 py-3 active:opacity-70"
      >
        <span className="text-sm font-medium text-text-primary">{eventLabel(event, course)}</span>
        <span className="text-xs tabular-nums text-text-tertiary">
          {pb ? formatTime(pb.timeSeconds) : "--"}
        </span>
      </button>

      {expanded && (
        <div className="space-y-4 pb-5">
          <div className="text-center">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              Meet best ({course})
            </p>
            {pb ? (
              <>
                <p className="text-lg tabular-nums text-text-primary">{formatTime(pb.timeSeconds)}</p>
                <p className="text-xs text-text-tertiary">
                  {formatDateLabel(pb.date)} · {pb.meetName}
                </p>
                {achieved.length > 0 && (
                  <div className="mt-2 flex flex-wrap justify-center gap-1">
                    {achieved.map((s) => (
                      <Badge key={s.id} tone={s.verified ? "accent" : "warning"}>
                        {s.meet}
                        {!s.verified && " (unverified)"}
                      </Badge>
                    ))}
                  </div>
                )}
                {nextCut && (
                  <p className="mt-2 text-xs text-text-tertiary">
                    {gapToCut(pb.timeSeconds, nextCut).deltaSeconds.toFixed(2)}s off {nextCut.meet}
                    {!nextCut.verified && " (unverified)"}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-text-tertiary">No meet result logged yet.</p>
            )}
          </div>

          {practiceBests.length > 0 && (
            <div>
              <p className="mb-1 text-center text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Best practice times ({course})
              </p>
              <div className="space-y-1">
                {practiceBests.map((b) => (
                  <PracticeBestRow key={`${b.suit}-${b.start}`} best={b} />
                ))}
              </div>
            </div>
          )}

          {allStandards.length > 0 && (
            <div>
              <p className="mb-1 text-center text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Cuts ({course})
              </p>
              <div className="space-y-1">
                {allStandards.map((s) => {
                  const met = achieved.some((a) => a.id === s.id);
                  return (
                    <div key={s.id} className="flex items-center justify-between text-xs">
                      <span className={met ? "text-accent" : "text-text-tertiary"}>
                        {s.meet}
                        {!s.verified && " (unverified)"}
                      </span>
                      <span className={met ? "text-accent" : "text-text-tertiary"}>
                        {formatTime(s.timeSeconds)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {eventResults.length > 1 && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowAllResults((v) => !v)}
                className="text-xs text-accent"
              >
                {showAllResults ? "Hide" : "View"} all {eventResults.length} results
              </button>
              {showAllResults && (
                <div className="mt-2 space-y-1">
                  {eventResults.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-xs">
                      <span className="text-text-tertiary">
                        {formatDateLabel(r.date)} · {r.meetName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="tabular-nums text-text-secondary">
                          {formatTime(r.timeSeconds)}
                        </span>
                        <button
                          type="button"
                          onClick={() => db.meetResults.delete(r.id)}
                          className="text-text-tertiary active:opacity-70"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-center">
            {showAddResult ? (
              <AddResultForm event={event} course={course} onDone={() => setShowAddResult(false)} />
            ) : (
              <button
                type="button"
                onClick={() => setShowAddResult(true)}
                className="flex items-center gap-1 rounded-lg border border-dashed border-border px-2 py-1 text-xs text-text-tertiary active:opacity-70"
              >
                <Plus size={12} /> Log a time
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PracticeBestRow({ best }: { best: BestPracticeTime }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-text-tertiary">{SUIT_START_LABEL[`${best.suit}-${best.start}`]}</span>
      <span className="tabular-nums text-text-secondary">
        {formatTime(best.timeSeconds)} · {formatDateLabel(best.date)}
      </span>
    </div>
  );
}

function AddResultForm({
  event,
  course,
  onDone,
}: {
  event: SwimEvent;
  course: Course;
  onDone: () => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [meetName, setMeetName] = useState("");
  const [timeText, setTimeText] = useState("");
  const [suit, setSuit] = useState<SuitType>("tech");

  async function save() {
    const timeSeconds = parseTime(timeText);
    if (timeSeconds === null || !meetName.trim()) return;
    const result: MeetResult = {
      id: newId(),
      date,
      meetName: meetName.trim(),
      event,
      course,
      timeSeconds,
      suit,
      createdAt: new Date().toISOString(),
    };
    await db.meetResults.put(result);
    onDone();
  }

  return (
    <div className="w-full space-y-2 rounded-lg border border-dashed border-border p-2 text-left">
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
      <Input
        placeholder="Meet name"
        value={meetName}
        onChange={(e) => setMeetName(e.target.value)}
      />
      <Segmented
        options={[
          { label: "Practice suit", value: "practice" as SuitType },
          { label: "Tech suit", value: "tech" as SuitType },
        ]}
        value={suit}
        onChange={setSuit}
      />
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onDone}>
          Cancel
        </Button>
        <Button size="sm" className="flex-1" onClick={save}>
          Save
        </Button>
      </div>
    </div>
  );
}
