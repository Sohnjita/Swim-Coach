"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { db, newId } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { formatTime, parseTime } from "@/lib/conversions";
import { SWIM_EVENTS, eventLabel, type SwimEvent } from "@/lib/events";
import { buildStandardsSeed, STANDARDS_SEED_DISCLAIMER } from "@/lib/standards";
import type { Course, QualifyingStandard } from "@/lib/types";

const COURSES: { label: string; value: Course }[] = [
  { label: "SCY", value: "SCY" },
  { label: "SCM", value: "SCM" },
  { label: "LCM", value: "LCM" },
];

export default function StandardsPage() {
  const standards = useLiveQuery(() => db.standards.toArray(), []) ?? [];
  const [showNew, setShowNew] = useState(false);

  async function loadSeed() {
    if (
      !confirm(
        "Add a starter set of unverified Futures-level SCY cuts? You can edit or delete them anytime.",
      )
    ) {
      return;
    }
    await db.standards.bulkPut(buildStandardsSeed());
  }

  return (
    <div>
      <PageHeader
        leading={
          <Link href="/times">
            <Button variant="ghost" size="icon" aria-label="Back to times">
              <ArrowLeft size={18} />
            </Button>
          </Link>
        }
        title="Standards"
        action={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Add standard"
            onClick={() => setShowNew((v) => !v)}
          >
            <Plus size={20} />
          </Button>
        }
      />
      <div className="space-y-4 p-4">
        {standards.length === 0 && !showNew && (
          <div className="space-y-2 rounded-lg border border-dashed border-border p-3 text-center">
            <p className="text-xs text-text-tertiary">{STANDARDS_SEED_DISCLAIMER}</p>
            <Button variant="secondary" size="sm" onClick={loadSeed}>
              Load starter cuts (unverified)
            </Button>
          </div>
        )}

        {showNew && <NewStandardForm onDone={() => setShowNew(false)} />}

        <div className="divide-y divide-border/40">
          {SWIM_EVENTS.map((event) => {
            const rows = standards
              .filter((s) => s.event === event)
              .sort((a, b) => a.timeSeconds - b.timeSeconds);
            if (rows.length === 0) return null;
            return (
              <div key={event} className="py-3 first:pt-0">
                <p className="mb-1 text-sm font-medium text-text-primary">
                  {eventLabel(event, "SCY")}
                </p>
                <div className="space-y-1.5">
                  {rows.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-text-secondary">{s.meet}</span>
                        <Badge tone="neutral">{s.course}</Badge>
                        <Badge tone="neutral">{s.gender}</Badge>
                        {!s.verified && <Badge tone="warning">unverified</Badge>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="tabular-nums text-text-primary">
                          {formatTime(s.timeSeconds)}
                        </span>
                        <button
                          type="button"
                          onClick={() => db.standards.delete(s.id)}
                          className="text-text-tertiary active:opacity-70"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function NewStandardForm({ onDone }: { onDone: () => void }) {
  const [meet, setMeet] = useState("");
  const [event, setEvent] = useState<SwimEvent>(SWIM_EVENTS[0]);
  const [course, setCourse] = useState<Course>("SCY");
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
      verified: true,
    };
    await db.standards.put(standard);
    onDone();
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border p-2">
      <Input
        placeholder="Meet name (e.g. 2026 Winter Juniors)"
        value={meet}
        onChange={(e) => setMeet(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <Select value={event} onChange={(e) => setEvent(e.target.value as SwimEvent)}>
          {SWIM_EVENTS.map((ev) => (
            <option key={ev} value={ev}>
              {eventLabel(ev, course)}
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
