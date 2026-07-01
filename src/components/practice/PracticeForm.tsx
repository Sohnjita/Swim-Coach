"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { db, newId } from "@/lib/db";
import type { Course, Practice, PracticeSet } from "@/lib/types";
import { todayISO } from "@/lib/format";
import { takePendingSet } from "@/lib/practiceHelpers";
import { Segmented } from "@/components/ui/Segmented";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { SetEditor } from "./SetEditor";

const COURSES: { label: string; value: Course }[] = [
  { label: "SCY", value: "SCY" },
  { label: "SCM", value: "SCM" },
  { label: "LCM", value: "LCM" },
];

function emptySet(): PracticeSet {
  return { id: newId(), type: "aerobic", label: "", reps: [] };
}

export function PracticeForm({ initial }: { initial?: Practice }) {
  const router = useRouter();
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [course, setCourse] = useState<Course>(initial?.course ?? "SCY");
  const [sets, setSets] = useState<PracticeSet[]>(initial?.sets ?? [emptySet()]);
  const [sleepHours, setSleepHours] = useState(initial?.sleepHours?.toString() ?? "");
  const [bodyWeight, setBodyWeight] = useState(
    initial?.bodyWeightKg?.toString() ?? "",
  );
  const [gymThatDay, setGymThatDay] = useState(initial?.gymThatDay ?? false);
  const [overallRpe, setOverallRpe] = useState(initial?.overallRpe?.toString() ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) return; // only prefill fresh practices
    const pending = takePendingSet();
    if (!pending) return;
    // Reading sessionStorage (a browser-only external system) once on mount —
    // the sanctioned use for an Effect, not a derived-state anti-pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSets((prev) => {
      const withoutEmpty = prev.filter((s) => s.reps.length > 0);
      return [...withoutEmpty, pending.set];
    });
    setCourse(pending.course as Course);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateSet(id: string, next: PracticeSet) {
    setSets((prev) => prev.map((s) => (s.id === id ? next : s)));
  }

  function removeSet(id: string) {
    setSets((prev) => prev.filter((s) => s.id !== id));
  }

  async function save() {
    setSaving(true);
    const now = new Date().toISOString();
    const practice: Practice = {
      id: initial?.id ?? newId(),
      date,
      course,
      sets,
      sleepHours: sleepHours === "" ? null : Number(sleepHours),
      bodyWeightKg: bodyWeight === "" ? null : Number(bodyWeight),
      gymThatDay,
      overallRpe: overallRpe === "" ? null : Number(overallRpe),
      notes: notes || undefined,
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    await db.practices.put(practice);
    setSaving(false);
    router.push(`/practices/${practice.id}`);
  }

  return (
    <div className="space-y-4 p-4 pb-24">
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Course">
            <Segmented options={COURSES} value={course} onChange={setCourse} />
          </Field>
        </div>
      </Card>

      {sets.map((set) => (
        <SetEditor
          key={set.id}
          set={set}
          onChange={(s) => updateSet(set.id, s)}
          onRemove={() => removeSet(set.id)}
        />
      ))}

      <Button
        variant="secondary"
        className="w-full"
        onClick={() => setSets((prev) => [...prev, emptySet()])}
      >
        <Plus size={16} /> Add set
      </Button>

      <Card>
        <CardTitle className="mb-3">Context</CardTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sleep (hours)">
            <Input
              inputMode="decimal"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              placeholder="7.5"
            />
          </Field>
          <Field label="Body weight (kg)">
            <Input
              inputMode="decimal"
              value={bodyWeight}
              onChange={(e) => setBodyWeight(e.target.value)}
              placeholder="70"
            />
          </Field>
          <Field label="Overall RPE (1-10)">
            <Input
              inputMode="numeric"
              value={overallRpe}
              onChange={(e) => setOverallRpe(e.target.value)}
              placeholder="7"
            />
          </Field>
          <Field label="Gym that day">
            <Segmented
              options={[
                { label: "No", value: "no" },
                { label: "Yes", value: "yes" },
              ]}
              value={gymThatDay ? "yes" : "no"}
              onChange={(v) => setGymThatDay(v === "yes")}
            />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </Card>

      <Button className="w-full" onClick={save} disabled={saving}>
        {saving ? "Saving..." : "Save practice"}
      </Button>
    </div>
  );
}
