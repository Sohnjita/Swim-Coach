"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2 } from "lucide-react";
import { db, SCORING_CONFIG_ID, newId } from "@/lib/db";
import type { Course, CutEvent, MeetResult, QualifyingStandard, SuitType } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { DEFAULT_SCORING_CONFIG, predictGoalTimes } from "@/lib/scoring";
import { formatTime, parseTime } from "@/lib/conversions";
import { gapToCut } from "@/lib/standards";
import { formatDateLabel, todayISO } from "@/lib/format";

const EVENTS: { label: string; value: CutEvent }[] = [
  { label: "50 Breast", value: "50 Breast" },
  { label: "100 Breast", value: "100 Breast" },
];
const COURSES: { label: string; value: Course }[] = [
  { label: "SCY", value: "SCY" },
  { label: "SCM", value: "SCM" },
  { label: "LCM", value: "LCM" },
];

export default function TimesPage() {
  const practices = useLiveQuery(() => db.practices.toArray(), []);
  const scoringConfig =
    useLiveQuery(() => db.scoringConfig.get(SCORING_CONFIG_ID), []) ??
    DEFAULT_SCORING_CONFIG;
  const results = useLiveQuery(
    () => db.meetResults.orderBy("date").reverse().toArray(),
    [],
  );
  const standards = useLiveQuery(() => db.standards.toArray(), []);

  const [showResultForm, setShowResultForm] = useState(false);
  const [showStandardForm, setShowStandardForm] = useState(false);

  const predictions =
    practices && scoringConfig ? predictGoalTimes(practices, scoringConfig) : [];

  const bestByEvent = (event: CutEvent) => {
    const matches = (results ?? []).filter((r) => r.event === event);
    if (matches.length === 0) return null;
    return matches.reduce((best, r) => (r.timeSeconds < best.timeSeconds ? r : best));
  };

  async function deleteResult(id: string) {
    await db.meetResults.delete(id);
  }
  async function deleteStandard(id: string) {
    await db.standards.delete(id);
  }

  return (
    <div>
      <PageHeader title="Times" />
      <div className="space-y-4 p-4">
        <Card>
          <CardTitle className="mb-3">Goal projection</CardTitle>
          <div className="space-y-3">
            {predictions.map((pred) => {
              const pb = bestByEvent(pred.event);
              return (
                <div key={pred.event} className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium text-text-primary">{pred.event}</p>
                  <div className="mt-1 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-text-tertiary">Meet PB</p>
                      <p className="tabular-nums text-sm text-text-primary">
                        {pb ? formatTime(pb.timeSeconds) : "--"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-tertiary">Best practice (LCM eq.)</p>
                      <p className="tabular-nums text-sm text-text-primary">
                        {formatTime(pred.bestEquivalentSeconds)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-text-tertiary">Projected tapered</p>
                      <p className="tabular-nums text-sm text-accent">
                        {formatTime(pred.predictedTaperedSeconds)}
                      </p>
                    </div>
                  </div>
                  {standards
                    ?.filter((s) => s.event === pred.event)
                    .map((s) => {
                      if (pred.predictedTaperedSeconds === null) return null;
                      const gap = gapToCut(pred.predictedTaperedSeconds, s);
                      return (
                        <p
                          key={s.id}
                          className={`mt-2 text-xs ${gap.underCut ? "text-accent" : "text-text-tertiary"}`}
                        >
                          {s.meet} ({s.course}): {formatTime(s.timeSeconds)} —{" "}
                          {gap.underCut
                            ? `${Math.abs(gap.deltaSeconds).toFixed(2)}s under`
                            : `${gap.deltaSeconds.toFixed(2)}s off`}
                        </p>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Meet results</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowResultForm((v) => !v)}>
              <Plus size={18} />
            </Button>
          </div>
          {showResultForm && <NewResultForm onDone={() => setShowResultForm(false)} />}
          {(!results || results.length === 0) && !showResultForm ? (
            <p className="text-sm text-text-tertiary">No meet results logged yet.</p>
          ) : (
            <ul className="space-y-2">
              {results?.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-border p-2 text-sm"
                >
                  <div>
                    <p className="text-text-primary">
                      {r.event} · {formatTime(r.timeSeconds)}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {formatDateLabel(r.date)} · {r.meetName} · {r.course}
                    </p>
                  </div>
                  <button onClick={() => deleteResult(r.id)} className="p-1 text-text-tertiary">
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Qualifying standards</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowStandardForm((v) => !v)}>
              <Plus size={18} />
            </Button>
          </div>
          <p className="mb-2 text-xs text-text-tertiary">
            USA Swimming had not published official 2028 Olympic Trials entry
            times as of this build. Add cuts here yourself as they&apos;re
            announced, or add Sectional/Futures/club standards to track
            against now.
          </p>
          {showStandardForm && (
            <NewStandardForm onDone={() => setShowStandardForm(false)} />
          )}
          {(!standards || standards.length === 0) && !showStandardForm ? (
            <p className="text-sm text-text-tertiary">No standards added yet.</p>
          ) : (
            <ul className="space-y-2">
              {standards?.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg border border-border p-2 text-sm"
                >
                  <div>
                    <p className="text-text-primary">
                      {s.event} · {formatTime(s.timeSeconds)} ({s.course})
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {s.meet} · {s.gender}
                    </p>
                  </div>
                  <button onClick={() => deleteStandard(s.id)} className="p-1 text-text-tertiary">
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function NewResultForm({ onDone }: { onDone: () => void }) {
  const [date, setDate] = useState(todayISO());
  const [meetName, setMeetName] = useState("");
  const [event, setEvent] = useState<CutEvent>("100 Breast");
  const [course, setCourse] = useState<Course>("LCM");
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
    <div className="mb-3 space-y-2 rounded-lg border border-dashed border-border p-2">
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
      <div className="grid grid-cols-2 gap-2">
        <Select value={event} onChange={(e) => setEvent(e.target.value as CutEvent)}>
          {EVENTS.map((ev) => (
            <option key={ev.value} value={ev.value}>
              {ev.label}
            </option>
          ))}
        </Select>
        <Segmented options={COURSES} value={course} onChange={setCourse} />
      </div>
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
          Add
        </Button>
      </div>
    </div>
  );
}

function NewStandardForm({ onDone }: { onDone: () => void }) {
  const [meet, setMeet] = useState("");
  const [event, setEvent] = useState<CutEvent>("100 Breast");
  const [course, setCourse] = useState<Course>("LCM");
  const [gender, setGender] = useState<"M" | "F">("M");
  const [timeText, setTimeText] = useState("");

  async function save() {
    const timeSeconds = parseTime(timeText);
    if (timeSeconds === null || !meet.trim()) return;
    const standard: QualifyingStandard = {
      id: newId(),
      meet: meet.trim(),
      event,
      course,
      gender,
      timeSeconds,
    };
    await db.standards.put(standard);
    onDone();
  }

  return (
    <div className="mb-3 space-y-2 rounded-lg border border-dashed border-border p-2">
      <Input
        placeholder="Meet name (e.g. 2028 US Olympic Trials)"
        value={meet}
        onChange={(e) => setMeet(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <Select value={event} onChange={(e) => setEvent(e.target.value as CutEvent)}>
          {EVENTS.map((ev) => (
            <option key={ev.value} value={ev.value}>
              {ev.label}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Time (e.g. 1:02.35)"
          value={timeText}
          onChange={(e) => setTimeText(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Segmented options={COURSES} value={course} onChange={setCourse} />
        <Segmented
          options={[
            { label: "Men", value: "M" as const },
            { label: "Women", value: "F" as const },
          ]}
          value={gender}
          onChange={setGender}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onDone}>
          Cancel
        </Button>
        <Button size="sm" className="flex-1" onClick={save}>
          Add
        </Button>
      </div>
    </div>
  );
}
