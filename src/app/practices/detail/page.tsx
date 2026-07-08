"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Check, ChevronDown, Copy, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { db, newId, SCORING_CONFIG_ID } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Badge } from "@/components/ui/Badge";
import { Field, Input } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { NotationDocument, type ProjectionContext } from "@/components/practice/NotationDocument";
import { RepRow } from "@/components/practice/RepRow";
import {
  appendItemToRound,
  countReps,
  formatLines,
  moveLineBy,
  removeLineById,
  totalDistance,
  updateLineById,
} from "@/lib/lineTree";
import { buildRepHistory, DEFAULT_SCORING_CONFIG, scoreSet, stampPracticeScores } from "@/lib/scoring";
import {
  emptyPracticeSet,
  energyFocusLabel,
  ENERGY_FOCUS_OPTIONS,
  makeSetFromTemplate,
  practiceSummaryLine,
} from "@/lib/practiceHelpers";
import { formatDateLabel } from "@/lib/format";
import { recommendationToPracticeSet, recommendSet } from "@/lib/setRecommendation";
import type {
  Course,
  EnergyFocus,
  Practice,
  PracticeLine,
  PracticeSet,
  Rep,
  RepGroupLine,
  SetTemplate,
  SetType,
} from "@/lib/types";

const SET_TYPES: SetType[] = ["aerobic", "threshold", "sprint", "lactate", "technique"];
const COURSES: { label: string; value: Course }[] = [
  { label: "SCY", value: "SCY" },
  { label: "SCM", value: "SCM" },
  { label: "LCM", value: "LCM" },
  { label: "Other", value: "Other" },
];

export default function PracticeDetailPage() {
  return (
    <Suspense fallback={null}>
      <PracticeDetailRouter />
    </Suspense>
  );
}

/**
 * /practices/detail is a single route with the practice id in the query
 * string, so navigating from one practice to another would otherwise
 * re-render the same PracticeDetail instance instead of remounting it.
 * Keying by id forces a fresh mount (and fresh useState defaults, notably
 * `editing`) every time the id changes.
 */
function PracticeDetailRouter() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const startInEditMode = searchParams.get("new") === "1";
  return <PracticeDetail key={id} id={id} startInEditMode={startInEditMode} />;
}

function PracticeDetail({ id, startInEditMode }: { id: string; startInEditMode: boolean }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  // Freshly-created practices (routed here with ?new=1) open straight into
  // edit mode so there's something to write; otherwise start in view mode.
  const [editing, setEditing] = useState(startInEditMode);
  // A freshly-added blank block should open straight into title editing —
  // tracks which block id just got inserted so BlockPanel can seed its
  // editingLabel state from it, then clears itself once consumed.
  const [justAddedSetId, setJustAddedSetId] = useState<string | null>(null);

  const practice = useLiveQuery(() => db.practices.get(id), [id]);
  const allPractices = useLiveQuery(() => db.practices.toArray(), []);
  const templates = useLiveQuery(() => db.setTemplates.toArray(), []);
  const meets = useLiveQuery(() => db.meets.toArray(), []) ?? [];
  const scoringConfig =
    useLiveQuery(() => db.scoringConfig.get(SCORING_CONFIG_ID), []) ??
    DEFAULT_SCORING_CONFIG;

  if (practice === undefined || allPractices === undefined) {
    return null;
  }
  if (practice === null || !practice) {
    return (
      <div className="p-4">
        <p className="text-sm text-text-tertiary">Practice not found.</p>
      </div>
    );
  }

  const allPracticesList: Practice[] = allPractices;
  const history = buildRepHistory(allPracticesList, scoringConfig);
  const currentPractice: Practice = practice;
  const projectionContext: Omit<ProjectionContext, "setType"> = {
    history,
    config: scoringConfig,
    course: currentPractice.course,
  };

  async function save(next: Practice) {
    // Snapshot scores at save time (not recomputed live everywhere else)
    // so a practice's score stays fixed once you're done editing it, even
    // as more history is logged elsewhere — but still refreshes each time
    // you actively edit *this* practice, which is what backfilling needs.
    const stamped = stampPracticeScores(next, history, scoringConfig);
    await db.practices.put({ ...stamped, updatedAt: new Date().toISOString() });
  }

  async function handleDelete() {
    if (!confirm("Delete this practice? This cannot be undone.")) return;
    await db.practices.delete(id);
    router.push("/practices");
  }

  async function handleCopy() {
    const text = currentPractice.sets
      .map((set) => [set.label || set.type, ...formatLines(set.lines)].join("\n"))
      .join("\n\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function setLines(setId: string, lines: PracticeLine[]) {
    const set = currentPractice.sets.find((s) => s.id === setId);
    if (!set) return;
    const sets = currentPractice.sets.map((s) => (s.id === setId ? { ...s, lines } : s));
    save({ ...currentPractice, sets });
  }

  function updateSetLine(setId: string, lineId: string, next: PracticeLine) {
    const set = currentPractice.sets.find((s) => s.id === setId);
    if (!set) return;
    setLines(setId, updateLineById(set.lines, lineId, next));
  }

  function deleteSetLine(setId: string, lineId: string) {
    const set = currentPractice.sets.find((s) => s.id === setId);
    if (!set) return;
    setLines(setId, removeLineById(set.lines, lineId));
  }

  function moveSetLine(setId: string, lineId: string, delta: number) {
    const set = currentPractice.sets.find((s) => s.id === setId);
    if (!set) return;
    setLines(setId, moveLineBy(set.lines, lineId, delta));
  }

  function addSetLine(setId: string, line: PracticeLine, parentRoundId?: string) {
    const set = currentPractice.sets.find((s) => s.id === setId);
    if (!set) return;
    const lines = parentRoundId
      ? appendItemToRound(set.lines, parentRoundId, line)
      : [...set.lines, line];
    setLines(setId, lines);
  }

  function updateRep(setId: string, repId: string, rep: Rep) {
    const sets = currentPractice.sets.map((s) =>
      s.id === setId ? { ...s, reps: s.reps.map((r) => (r.id === repId ? rep : r)) } : s,
    );
    save({ ...currentPractice, sets });
  }

  function addRep(setId: string) {
    const set = currentPractice.sets.find((s) => s.id === setId);
    if (!set) return;
    const lastRepsLine = [...set.lines].reverse().find(
      (l): l is RepGroupLine => l.kind === "reps",
    );
    const rep: Rep = {
      id: newId(),
      repIndex: set.reps.length + 1,
      distance: lastRepsLine?.distance ?? 100,
      stroke: lastRepsLine?.stroke ?? "free",
      time: null,
      strokeCount: null,
      restIntervalSeconds: lastRepsLine?.intervalSeconds ?? null,
      rpe: null,
      start: "push",
      suit: "practice",
      notes: lastRepsLine?.tag,
      score: null,
    };
    const sets = currentPractice.sets.map((s) =>
      s.id === setId ? { ...s, reps: [...s.reps, rep] } : s,
    );
    save({ ...currentPractice, sets });
  }

  function removeRep(setId: string, repId: string) {
    const sets = currentPractice.sets.map((s) => {
      if (s.id !== setId) return s;
      const reps = s.reps
        .filter((r) => r.id !== repId)
        .map((r, i) => ({ ...r, repIndex: i + 1 }));
      return { ...s, reps };
    });
    save({ ...currentPractice, sets });
  }

  function updateBlockLabel(setId: string, label: string) {
    const sets = currentPractice.sets.map((s) => (s.id === setId ? { ...s, label } : s));
    save({ ...currentPractice, sets });
  }

  function cycleBlockType(setId: string) {
    const sets = currentPractice.sets.map((s) => {
      if (s.id !== setId) return s;
      const idx = SET_TYPES.indexOf(s.type);
      return { ...s, type: SET_TYPES[(idx + 1) % SET_TYPES.length] };
    });
    save({ ...currentPractice, sets });
  }

  function removeBlock(setId: string) {
    if (currentPractice.sets.length <= 1) return;
    if (!confirm("Remove this block?")) return;
    save({ ...currentPractice, sets: currentPractice.sets.filter((s) => s.id !== setId) });
  }

  function insertBlockAt(index: number, block: PracticeSet) {
    const sets = [...currentPractice.sets];
    sets.splice(index + 1, 0, block);
    save({ ...currentPractice, sets });
  }

  function insertBlockAfter(index: number) {
    const block = emptyPracticeSet();
    insertBlockAt(index, block);
    setJustAddedSetId(block.id);
  }

  function insertTemplateAfter(index: number, template: SetTemplate) {
    insertBlockAt(index, makeSetFromTemplate(template));
  }

  function insertSuggestedAfter(index: number) {
    const recommendation = recommendSet(allPracticesList, meets, templates ?? [], currentPractice.date);
    const block = recommendationToPracticeSet(recommendation);
    insertBlockAt(index, block);
    setJustAddedSetId(block.id);
  }

  return (
    <div>
      <PageHeader
        leading={
          <Link href="/practices">
            <Button variant="ghost" size="icon" aria-label="Back to practices">
              <ArrowLeft size={18} />
            </Button>
          </Link>
        }
        title={formatDateLabel(practice.date)}
        subtitle={`${practice.course} · ${practiceSummaryLine(practice)}`}
        action={
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditing((v) => !v)}
              aria-label={editing ? "Done editing" : "Edit practice"}
            >
              {editing ? <Check size={18} /> : <Pencil size={18} />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Copy written workout">
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDelete} aria-label="Delete practice">
              <Trash2 size={18} />
            </Button>
          </div>
        }
      />

      <div className="p-4">
        <div className="mb-5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {editingDate ? (
              <input
                type="date"
                autoFocus
                value={practice.date}
                onChange={(e) => save({ ...currentPractice, date: e.target.value })}
                onBlur={() => setEditingDate(false)}
                className="bg-transparent text-base font-medium text-text-primary outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingDate(true)}
                className="text-base font-medium text-text-primary active:opacity-70"
              >
                {formatDateLabel(practice.date)}
              </button>
            )}
            <span className="text-text-tertiary">·</span>
            <CourseField
              practice={practice}
              onCourseChange={(course) =>
                save({
                  ...currentPractice,
                  course,
                  customPoolLengthMeters:
                    course === "Other" ? currentPractice.customPoolLengthMeters : null,
                })
              }
              onPoolLengthChange={(meters) =>
                save({ ...currentPractice, customPoolLengthMeters: meters })
              }
            />
          </div>
          <FocusField
            focus={practice.focus ?? "aerobic"}
            onChange={(focus) => save({ ...currentPractice, focus })}
          />
        </div>

        <div className="space-y-1">
          {practice.sets.length === 0 &&
            (editing ? (
              <BlockActionsBar
                templates={templates ?? []}
                onAddBlock={() => insertBlockAfter(-1)}
                onAddTemplate={(template) => insertTemplateAfter(-1, template)}
                onAddSuggested={() => insertSuggestedAfter(-1)}
              />
            ) : (
              <p className="text-sm text-text-tertiary">No blocks yet.</p>
            ))}
          {practice.sets.map((set, i) => {
            const { repScores, setScore } = scoreSet(
              set,
              practice.course,
              practice.id,
              history,
              scoringConfig,
            );
            return (
              <div key={set.id}>
                <BlockPanel
                  set={set}
                  setScore={setScore}
                  editing={editing}
                  canRemove={practice.sets.length > 1}
                  projectionContext={projectionContext}
                  autoFocusLabel={set.id === justAddedSetId}
                  onAutoFocusConsumed={() => setJustAddedSetId(null)}
                  onLabelChange={(label) => updateBlockLabel(set.id, label)}
                  onCycleType={() => cycleBlockType(set.id)}
                  onRemove={() => removeBlock(set.id)}
                  onUpdateLine={(lineId, next) => updateSetLine(set.id, lineId, next)}
                  onDeleteLine={(lineId) => deleteSetLine(set.id, lineId)}
                  onMoveLine={(lineId, delta) => moveSetLine(set.id, lineId, delta)}
                  onAddLine={(line, parentRoundId) => addSetLine(set.id, line, parentRoundId)}
                  onUpdateRep={(repId, rep) => updateRep(set.id, repId, rep)}
                  onAddRep={() => addRep(set.id)}
                  onRemoveRep={(repId) => removeRep(set.id, repId)}
                  repScores={repScores}
                />
                {editing && (
                  <BlockActionsBar
                    templates={templates ?? []}
                    onAddBlock={() => insertBlockAfter(i)}
                    onAddTemplate={(template) => insertTemplateAfter(i, template)}
                    onAddSuggested={() => insertSuggestedAfter(i)}
                  />
                )}
              </div>
            );
          })}
        </div>

        <ContextPanel practice={practice} onChange={(patch) => save({ ...currentPractice, ...patch })} />
      </div>
    </div>
  );
}

function CourseField({
  practice,
  onCourseChange,
  onPoolLengthChange,
}: {
  practice: Practice;
  onCourseChange: (course: Course) => void;
  onPoolLengthChange: (meters: number | null) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex items-center">
        <select
          value={practice.course}
          onChange={(e) => onCourseChange(e.target.value as Course)}
          className="appearance-none bg-transparent pr-4 text-base font-medium text-text-secondary outline-none"
        >
          {COURSES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <ChevronDown size={12} className="pointer-events-none absolute right-0 text-text-tertiary" />
      </div>
      {practice.course === "Other" && (
        <input
          inputMode="numeric"
          value={practice.customPoolLengthMeters ?? ""}
          onChange={(e) =>
            onPoolLengthChange(e.target.value === "" ? null : Number(e.target.value))
          }
          placeholder="length (m)"
          className="w-24 border-b border-border bg-transparent text-sm text-text-secondary outline-none focus:border-accent"
        />
      )}
    </div>
  );
}

function FocusField({
  focus,
  onChange,
}: {
  focus: EnergyFocus;
  onChange: (focus: EnergyFocus) => void;
}) {
  return (
    <div className="relative flex shrink-0 items-center">
      <select
        value={focus}
        onChange={(e) => onChange(e.target.value as EnergyFocus)}
        className="appearance-none bg-transparent pr-4 text-sm text-text-secondary outline-none"
      >
        {ENERGY_FOCUS_OPTIONS.map((f) => (
          <option key={f} value={f}>
            {energyFocusLabel(f)}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-0 text-text-tertiary" />
    </div>
  );
}

function BlockPanel({
  set,
  setScore,
  editing,
  canRemove,
  projectionContext,
  autoFocusLabel,
  onAutoFocusConsumed,
  onLabelChange,
  onCycleType,
  onRemove,
  onUpdateLine,
  onDeleteLine,
  onMoveLine,
  onAddLine,
  onUpdateRep,
  onAddRep,
  onRemoveRep,
  repScores,
}: {
  set: PracticeSet;
  setScore: number | null;
  editing: boolean;
  canRemove: boolean;
  projectionContext: Omit<ProjectionContext, "setType">;
  autoFocusLabel: boolean;
  onAutoFocusConsumed: () => void;
  onLabelChange: (label: string) => void;
  onCycleType: () => void;
  onRemove: () => void;
  onUpdateLine: (lineId: string, next: PracticeLine) => void;
  onDeleteLine: (lineId: string) => void;
  onMoveLine: (lineId: string, delta: number) => void;
  onAddLine: (line: PracticeLine, parentRoundId?: string) => void;
  onUpdateRep: (repId: string, rep: Rep) => void;
  onAddRep: () => void;
  onRemoveRep: (repId: string) => void;
  repScores: { repId: string; compositeScore: number | null }[];
}) {
  const [editingLabel, setEditingLabel] = useState(autoFocusLabel);
  const [labelDraft, setLabelDraft] = useState(set.label);

  useEffect(() => {
    if (autoFocusLabel) onAutoFocusConsumed();
    // Only ever meant to fire once, right after this block mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        {editing && editingLabel ? (
          <input
            autoFocus
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={() => {
              onLabelChange(labelDraft.trim());
              setEditingLabel(false);
            }}
            placeholder="Block title"
            className="h-7 min-w-0 flex-1 bg-transparent text-sm font-semibold text-text-primary outline-none placeholder:font-normal placeholder:text-text-tertiary"
          />
        ) : editing ? (
          <button
            type="button"
            onClick={() => {
              setLabelDraft(set.label);
              setEditingLabel(true);
            }}
            className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-text-primary active:opacity-70"
          >
            {set.label || "Untitled block"}
          </button>
        ) : (
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text-primary">
            {set.label || "Untitled block"}
          </p>
        )}
        <div className="flex shrink-0 items-center gap-2">
          {editing ? (
            <button type="button" onClick={onCycleType} className="active:opacity-70">
              <Badge tone="neutral" className="capitalize">
                {set.type}
              </Badge>
            </button>
          ) : (
            <Badge tone="neutral" className="capitalize">
              {set.type}
            </Badge>
          )}
          {setScore !== null && <ScoreRing score={setScore} size={32} />}
          {editing && canRemove && (
            <button type="button" onClick={onRemove} className="p-1 text-text-tertiary active:opacity-70">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <NotationDocument
        lines={set.lines}
        onUpdateLine={editing ? onUpdateLine : undefined}
        onDeleteLine={editing ? onDeleteLine : undefined}
        onMoveLine={editing ? onMoveLine : undefined}
        onAddLine={editing ? onAddLine : undefined}
        onLogTime={editing ? onAddRep : undefined}
        projectionContext={editing ? { ...projectionContext, setType: set.type } : undefined}
      />

      {set.reps.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-border/40 pt-3">
          {set.reps.map((rep) => (
            <RepRow
              key={rep.id}
              rep={rep}
              score={repScores.find((r) => r.repId === rep.id)?.compositeScore ?? null}
              onChange={(r) => onUpdateRep(rep.id, r)}
              onRemove={editing ? () => onRemoveRep(rep.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BlockActionsBar({
  templates,
  onAddBlock,
  onAddTemplate,
  onAddSuggested,
}: {
  templates: SetTemplate[];
  onAddBlock: () => void;
  onAddTemplate: (template: SetTemplate) => void;
  onAddSuggested?: () => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="my-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onAddBlock}
          className="flex items-center gap-1 rounded-lg border border-dashed border-border px-2 py-1 text-xs text-text-tertiary active:opacity-70"
        >
          <Plus size={12} /> Block
        </button>
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className="flex items-center gap-1 rounded-lg border border-dashed border-border px-2 py-1 text-xs text-text-tertiary active:opacity-70"
        >
          <Plus size={12} /> Set
        </button>
        {onAddSuggested && (
          <button
            type="button"
            onClick={onAddSuggested}
            className="flex items-center gap-1 rounded-lg border border-dashed border-accent/50 px-2 py-1 text-xs text-accent active:opacity-70"
          >
            <Sparkles size={12} /> Suggested
          </button>
        )}
      </div>

      {showPicker && (
        <div className="mt-1 divide-y divide-border/40 rounded-lg border border-border bg-bg-elevated-2">
          {templates.length === 0 ? (
            <p className="p-2 text-xs text-text-tertiary">
              No saved sets yet — save one from the Set Library first.
            </p>
          ) : (
            templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onAddTemplate(t);
                  setShowPicker(false);
                }}
                className="flex w-full items-center justify-between px-2 py-2 text-left active:opacity-70"
              >
                <div>
                  <p className="text-sm text-text-primary">{t.label || t.type}</p>
                  <p className="text-xs text-text-tertiary">
                    {countReps(t.lines)} reps · {totalDistance(t.lines)} {t.course === "SCY" ? "yd" : "m"}
                  </p>
                </div>
                <Badge tone="neutral" className="capitalize">
                  {t.type}
                </Badge>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ContextPanel({
  practice,
  onChange,
}: {
  practice: Practice;
  onChange: (patch: Partial<Practice>) => void;
}) {
  return (
    <div className="mt-2 border-t border-border/40 pt-5">
      <CardTitle className="mb-3">Context</CardTitle>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sleep (hours)">
          <Input
            inputMode="decimal"
            value={practice.sleepHours ?? ""}
            onChange={(e) =>
              onChange({ sleepHours: e.target.value === "" ? null : Number(e.target.value) })
            }
            placeholder="7.5"
          />
        </Field>
        <Field label="Body weight (lbs)">
          <Input
            inputMode="decimal"
            value={practice.bodyWeightLbs ?? ""}
            onChange={(e) =>
              onChange({ bodyWeightLbs: e.target.value === "" ? null : Number(e.target.value) })
            }
            placeholder="155"
          />
        </Field>
        <Field label="Overall RPE (1-10)">
          <Input
            inputMode="numeric"
            value={practice.overallRpe ?? ""}
            onChange={(e) =>
              onChange({ overallRpe: e.target.value === "" ? null : Number(e.target.value) })
            }
            placeholder="7"
          />
        </Field>
        <Field label="Gym that day">
          <Segmented
            options={[
              { label: "No", value: "no" },
              { label: "Yes", value: "yes" },
            ]}
            value={practice.gymThatDay ? "yes" : "no"}
            onChange={(v) => onChange({ gymThatDay: v === "yes" })}
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Notes">
          <Input
            value={practice.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value || undefined })}
          />
        </Field>
      </div>
    </div>
  );
}
