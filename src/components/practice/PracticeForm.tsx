"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Layers, Plus } from "lucide-react";
import { db, newId } from "@/lib/db";
import type { Course, Practice, PracticeSet } from "@/lib/types";
import { todayISO, formatDateLabel } from "@/lib/format";
import { makeSetFromTemplate, takePendingSet } from "@/lib/practiceHelpers";
import { Segmented } from "@/components/ui/Segmented";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BlockEditor } from "./BlockEditor";

const COURSES: { label: string; value: Course }[] = [
  { label: "SCY", value: "SCY" },
  { label: "SCM", value: "SCM" },
  { label: "LCM", value: "LCM" },
];

function emptyBlock(): PracticeSet {
  return { id: newId(), type: "aerobic", label: "", lines: [], reps: [] };
}

export function PracticeForm({
  initial,
  initialDate,
}: {
  initial?: Practice;
  initialDate?: string;
}) {
  const router = useRouter();
  const [date, setDate] = useState(initial?.date ?? initialDate ?? todayISO());
  const [course, setCourse] = useState<Course>(initial?.course ?? "SCY");
  const [blocks, setBlocks] = useState<PracticeSet[]>(initial?.sets ?? [emptyBlock()]);
  const [sleepHours, setSleepHours] = useState(initial?.sleepHours?.toString() ?? "");
  const [bodyWeight, setBodyWeight] = useState(
    initial?.bodyWeightKg?.toString() ?? "",
  );
  const [gymThatDay, setGymThatDay] = useState(initial?.gymThatDay ?? false);
  const [overallRpe, setOverallRpe] = useState(initial?.overallRpe?.toString() ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [showSetPicker, setShowSetPicker] = useState(false);
  const templates = useLiveQuery(() => db.setTemplates.toArray(), []);

  useEffect(() => {
    if (initial) return; // only prefill fresh practices
    const pending = takePendingSet();
    if (!pending) return;
    // Reading sessionStorage (a browser-only external system) once on mount —
    // the sanctioned use for an Effect, not a derived-state anti-pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBlocks((prev) => {
      const withoutEmpty = prev.filter((s) => s.lines.length > 0);
      return [...withoutEmpty, pending.set];
    });
    setCourse(pending.course as Course);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateBlock(id: string, next: PracticeSet) {
    setBlocks((prev) => prev.map((s) => (s.id === id ? next : s)));
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((s) => s.id !== id));
  }

  function insertTemplate(template: NonNullable<typeof templates>[number]) {
    const block = makeSetFromTemplate(
      template.type,
      template.label,
      template.repCount,
      template.distance,
      template.stroke,
      template.baseIntervalSeconds,
    );
    setBlocks((prev) => [...prev, block]);
    setShowSetPicker(false);
  }

  async function save() {
    setSaving(true);
    const now = new Date().toISOString();
    const practice: Practice = {
      id: initial?.id ?? newId(),
      date,
      course,
      sets: blocks,
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
    router.push(`/practices/detail?id=${practice.id}`);
  }

  return (
    <div className="space-y-4 p-4 pb-24">
      <div className="flex items-center justify-between px-1">
        {editingDate ? (
          <input
            type="date"
            autoFocus
            value={date}
            onChange={(e) => setDate(e.target.value)}
            onBlur={() => setEditingDate(false)}
            className="bg-transparent text-sm text-text-secondary outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingDate(true)}
            className="text-sm text-text-secondary"
          >
            {formatDateLabel(date)}
          </button>
        )}
        <Segmented options={COURSES} value={course} onChange={setCourse} />
      </div>

      {blocks.map((block) => (
        <BlockEditor
          key={block.id}
          block={block}
          onChange={(s) => updateBlock(block.id, s)}
          onRemove={() => removeBlock(block.id)}
        />
      ))}

      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => setBlocks((prev) => [...prev, emptyBlock()])}
        >
          <Plus size={16} /> Add block
        </Button>
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => setShowSetPicker((v) => !v)}
        >
          <Layers size={16} /> From set library
        </Button>
      </div>

      {showSetPicker && (
        <Card>
          <CardTitle className="mb-2">Insert a saved set</CardTitle>
          {!templates || templates.length === 0 ? (
            <p className="text-sm text-text-tertiary">
              No saved sets yet — save one from the Set Library first.
            </p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => insertTemplate(t)}
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-bg-elevated-2 p-2 text-left active:opacity-70"
                >
                  <div>
                    <p className="text-sm text-text-primary">{t.label}</p>
                    <p className="text-xs text-text-tertiary">
                      {t.repCount}x{t.distance} {t.stroke}
                      {t.baseIntervalSeconds ? ` · :${t.baseIntervalSeconds}` : ""}
                    </p>
                  </div>
                  <Badge tone="neutral" className="capitalize">
                    {t.type}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

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
