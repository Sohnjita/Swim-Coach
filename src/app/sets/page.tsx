"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { db, SCORING_CONFIG_ID, newId } from "@/lib/db";
import type { Course, SetTemplate, SetType, Stroke } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Segmented } from "@/components/ui/Segmented";
import { Field, Input, Select } from "@/components/ui/Field";
import { buildRepHistory, DEFAULT_SCORING_CONFIG } from "@/lib/scoring";
import { suggestSetVariation } from "@/lib/variations";
import { makeSetFromTemplate, stashPendingSet } from "@/lib/practiceHelpers";

const SET_TYPES: { label: string; value: SetType }[] = [
  { label: "Aerobic", value: "aerobic" },
  { label: "Threshold", value: "threshold" },
  { label: "Sprint", value: "sprint" },
  { label: "Lactate", value: "lactate" },
];

const STROKES: { label: string; value: Stroke }[] = [
  { label: "Free", value: "free" },
  { label: "Back", value: "back" },
  { label: "Breast", value: "breast" },
  { label: "Fly", value: "fly" },
  { label: "IM", value: "im" },
  { label: "Kick", value: "kick" },
  { label: "Drill", value: "drill" },
];

const COURSES: { label: string; value: Course }[] = [
  { label: "SCY", value: "SCY" },
  { label: "SCM", value: "SCM" },
  { label: "LCM", value: "LCM" },
];

export default function SetsPage() {
  const router = useRouter();
  const templates = useLiveQuery(() => db.setTemplates.toArray(), []);
  const practices = useLiveQuery(() => db.practices.toArray(), []);
  const scoringConfig =
    useLiveQuery(() => db.scoringConfig.get(SCORING_CONFIG_ID), []) ??
    DEFAULT_SCORING_CONFIG;
  const [showNew, setShowNew] = useState(false);
  const [suggestionFor, setSuggestionFor] = useState<string | null>(null);

  const history = practices ? buildRepHistory(practices, scoringConfig) : [];

  async function deleteTemplate(id: string) {
    await db.setTemplates.delete(id);
  }

  function startPractice(template: SetTemplate, targetInterval: number | null) {
    const set = makeSetFromTemplate(
      template.type,
      template.label,
      template.repCount,
      template.distance,
      template.stroke,
      targetInterval ?? template.baseIntervalSeconds,
    );
    stashPendingSet(set, template.course);
    router.push("/practices/new");
  }

  return (
    <div>
      <PageHeader
        title="Set Library"
        action={
          <Button variant="ghost" size="icon" onClick={() => setShowNew((v) => !v)}>
            <Plus size={20} />
          </Button>
        }
      />
      <div className="space-y-3 p-4">
        {showNew && (
          <NewTemplateForm onDone={() => setShowNew(false)} />
        )}

        {!templates || templates.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            Save reusable sets here — e.g. &ldquo;8x100 Breast Descend&rdquo; — so
            you can drop them into a practice and get pace/interval
            suggestions based on your history.
          </p>
        ) : (
          <div className="divide-y divide-border/40">
          {templates.map((template) => {
            const suggestion =
              suggestionFor === template.id
                ? suggestSetVariation(template, history)
                : null;
            return (
              <div key={template.id} className="py-3 first:pt-0">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {template.label}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {template.repCount}x{template.distance} {template.stroke} ·{" "}
                      {template.course}
                      {template.baseIntervalSeconds
                        ? ` · :${template.baseIntervalSeconds}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral" className="capitalize">
                      {template.type}
                    </Badge>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="p-1 text-text-tertiary"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {suggestion && (
                  <div className="mb-2 rounded-lg bg-accent-dim/40 p-2 text-xs text-text-secondary">
                    {suggestion.rationale}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      setSuggestionFor((cur) => (cur === template.id ? null : template.id))
                    }
                  >
                    <Sparkles size={14} /> Suggest
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() =>
                      startPractice(
                        template,
                        suggestion?.suggestedIntervalSeconds ?? null,
                      )
                    }
                  >
                    Start practice
                  </Button>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
}

function NewTemplateForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState<SetType>("aerobic");
  const [label, setLabel] = useState("");
  const [course, setCourse] = useState<Course>("SCY");
  const [stroke, setStroke] = useState<Stroke>("breast");
  const [repCount, setRepCount] = useState("8");
  const [distance, setDistance] = useState("100");
  const [interval, setInterval] = useState("90");

  async function save() {
    if (!label.trim()) return;
    const template: SetTemplate = {
      id: newId(),
      type,
      label: label.trim(),
      course,
      stroke,
      repCount: Number(repCount) || 1,
      distance: Number(distance) || 0,
      baseIntervalSeconds: interval === "" ? null : Number(interval),
      createdAt: new Date().toISOString(),
    };
    await db.setTemplates.put(template);
    onDone();
  }

  return (
    <Card>
      <CardTitle className="mb-3">New set template</CardTitle>
      <div className="space-y-3">
        <Segmented options={SET_TYPES} value={type} onChange={setType} />
        <Input
          placeholder="Label (e.g. 8x100 Breast Descend)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <div className="grid grid-cols-3 gap-2">
          <Field label="Reps">
            <Input
              inputMode="numeric"
              value={repCount}
              onChange={(e) => setRepCount(e.target.value)}
            />
          </Field>
          <Field label="Distance">
            <Input
              inputMode="numeric"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
            />
          </Field>
          <Field label="Interval (sec)">
            <Input
              inputMode="numeric"
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Stroke">
            <Select value={stroke} onChange={(e) => setStroke(e.target.value as Stroke)}>
              {STROKES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Course">
            <Segmented options={COURSES} value={course} onChange={setCourse} />
          </Field>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onDone}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={save}>
            Save
          </Button>
        </div>
      </div>
    </Card>
  );
}
