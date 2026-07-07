"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Dumbbell,
  Layers,
  ListPlus,
  Plus,
  Trophy,
  Upload,
} from "lucide-react";
import { db, newId, SCORING_CONFIG_ID } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { SwipeToDeleteRow } from "@/components/ui/SwipeToDeleteRow";
import { Field, Input } from "@/components/ui/Field";
import { MeetResultForm } from "@/components/practice/MeetResultForm";
import { buildRepHistory, DEFAULT_SCORING_CONFIG, scorePractice } from "@/lib/scoring";
import { newPractice, practiceSummaryLine } from "@/lib/practiceHelpers";
import { formatTime } from "@/lib/conversions";
import { formatDateLabel, todayISO } from "@/lib/format";
import { eventLabel } from "@/lib/events";
import { cn } from "@/lib/cn";
import {
  SORT_LABEL,
  sortPractices,
  toggleSort,
  type SortKey,
  type SortSpec,
} from "@/lib/practiceSort";
import type { CalendarEvent, Meet, MeetResult, Practice } from "@/lib/types";

const SORT_KEYS: SortKey[] = ["date", "score", "yardage", "type"];

const ROUND_LABEL: Record<string, string> = {
  prelim: "Prelim",
  final: "Final",
};

type FilterType = "all" | "practice" | "meet" | "lift";
const FILTERS: { label: string; value: FilterType }[] = [
  { label: "All", value: "all" },
  { label: "Practices", value: "practice" },
  { label: "Meets", value: "meet" },
  { label: "Lifts", value: "lift" },
];

interface MeetGroup {
  meet: Meet;
  results: MeetResult[];
}

function groupMeetResults(results: MeetResult[], meets: Meet[]): MeetGroup[] {
  const meetsById = new Map(meets.map((m) => [m.id, m]));
  const byMeetId = new Map<string, MeetResult[]>();
  for (const r of results) {
    const list = byMeetId.get(r.meetId) ?? [];
    list.push(r);
    byMeetId.set(r.meetId, list);
  }
  const groups: MeetGroup[] = [];
  for (const [meetId, group] of byMeetId) {
    const meet = meetsById.get(meetId);
    if (!meet) continue;
    groups.push({ meet, results: [...group].sort((a, b) => a.date.localeCompare(b.date)) });
  }
  return groups;
}

export default function PracticesPage() {
  const router = useRouter();
  const practices = useLiveQuery(() => db.practices.toArray(), []) ?? [];
  const meetResults = useLiveQuery(() => db.meetResults.toArray(), []) ?? [];
  const meets = useLiveQuery(() => db.meets.toArray(), []) ?? [];
  const calendarEvents = useLiveQuery(() => db.calendarEvents.toArray(), []) ?? [];
  const lifts = calendarEvents.filter((e) => e.type === "lift");

  const scoringConfig =
    useLiveQuery(() => db.scoringConfig.get(SCORING_CONFIG_ID), []) ??
    DEFAULT_SCORING_CONFIG;
  const [sortSpec, setSortSpec] = useState<SortSpec | null>({ key: "date", dir: "desc" });
  const [filter, setFilter] = useState<FilterType>("all");
  const [showAddMenu, setShowAddMenu] = useState(false);

  const history = buildRepHistory(practices, scoringConfig);
  const sortedPractices = sortPractices(practices, sortSpec, history, scoringConfig);
  const meetGroups = groupMeetResults(meetResults, meets).sort((a, b) =>
    b.meet.startDate.localeCompare(a.meet.startDate),
  );
  const sortedLifts = [...lifts].sort((a, b) => b.date.localeCompare(a.date));

  async function handleNewPractice() {
    const practice = newPractice(todayISO());
    await db.practices.put(practice);
    setShowAddMenu(false);
    router.push(`/practices/detail?id=${practice.id}&new=1`);
  }

  async function handleDeletePractice(id: string) {
    if (!confirm("Delete this practice? This cannot be undone.")) return;
    await db.practices.delete(id);
  }

  async function handleDeleteMeetGroup(group: MeetGroup) {
    if (!confirm(`Delete all ${group.results.length} result(s) from ${group.meet.name}?`)) return;
    await Promise.all(group.results.map((r) => db.meetResults.delete(r.id)));
    await db.meets.delete(group.meet.id);
  }

  async function handleDeleteLift(id: string) {
    await db.calendarEvents.delete(id);
  }

  async function toggleLiftCompleted(lift: CalendarEvent) {
    await db.calendarEvents.update(lift.id, { completed: !lift.completed });
  }

  const isEmpty = practices.length === 0 && meetGroups.length === 0 && lifts.length === 0;
  const showPractices = filter === "all" || filter === "practice";
  const showMeets = filter === "all" || filter === "meet";
  const showLifts = filter === "all" || filter === "lift";

  return (
    <div>
      <PageHeader
        title="Training"
        action={
          <div className="flex gap-1">
            <Link href="/sets">
              <Button variant="ghost" size="icon" aria-label="Set library">
                <Layers size={20} />
              </Button>
            </Link>
            <Link href="/practices/import">
              <Button variant="ghost" size="icon" aria-label="Import practices">
                <Upload size={20} />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Log practice, meet, or lift"
              onClick={() => setShowAddMenu((v) => !v)}
            >
              <Plus size={20} />
            </Button>
          </div>
        }
      />
      <div className="p-4">
        {showAddMenu && (
          <div className="mb-4">
            <QuickAddPanel onNewPractice={handleNewPractice} onDone={() => setShowAddMenu(false)} />
          </div>
        )}

        {isEmpty && !showAddMenu ? (
          <p className="text-sm text-text-tertiary">
            Nothing logged yet. Tap + to log a practice, meet, or lift.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              {FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "text-xs whitespace-nowrap",
                    filter === f.value ? "font-medium text-accent" : "text-text-tertiary",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filter === "practice" && (
              <div className="mb-3 flex flex-wrap items-center gap-3">
                {SORT_KEYS.map((key) => {
                  const active = sortSpec?.key === key;
                  const showUp = active && sortSpec!.dir === "desc";
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSortSpec((prev) => toggleSort(prev, key))}
                      className={cn(
                        "flex items-center gap-1 text-xs whitespace-nowrap",
                        active ? "font-medium text-accent" : "text-text-tertiary",
                      )}
                    >
                      {SORT_LABEL[key]}
                      {active && (showUp ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="divide-y divide-border/40">
              {showPractices &&
                sortedPractices.map((practice) => (
                  <PracticeRow
                    key={practice.id}
                    practice={practice}
                    score={scorePractice(practice, history, scoringConfig).practiceScore}
                    onClick={() => router.push(`/practices/detail?id=${practice.id}`)}
                    onDelete={() => handleDeletePractice(practice.id)}
                  />
                ))}

              {showMeets &&
                meetGroups.map((group) => (
                  <MeetGroupRow
                    key={group.meet.id}
                    group={group}
                    onDelete={() => handleDeleteMeetGroup(group)}
                  />
                ))}

              {showLifts &&
                sortedLifts.map((lift) => (
                  <LiftRow
                    key={lift.id}
                    lift={lift}
                    onClick={() => toggleLiftCompleted(lift)}
                    onDelete={() => handleDeleteLift(lift.id)}
                  />
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PracticeRow({
  practice,
  score,
  onClick,
  onDelete,
}: {
  practice: Practice;
  score: number | null;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <SwipeToDeleteRow onClick={onClick} onDelete={onDelete}>
      <div className="flex items-center gap-3 py-3">
        <ScoreRing score={score} size={48} />
        <div className="flex-1">
          <p className="text-sm font-medium text-text-primary">{formatDateLabel(practice.date)}</p>
          <p className="text-xs text-text-tertiary">
            {practice.course} · {practiceSummaryLine(practice)}
          </p>
        </div>
      </div>
    </SwipeToDeleteRow>
  );
}

function MeetGroupRow({ group, onDelete }: { group: MeetGroup; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(group.meet.name);
  const [editingDates, setEditingDates] = useState(false);
  const [startDraft, setStartDraft] = useState(group.meet.startDate);
  const [endDraft, setEndDraft] = useState(group.meet.endDate);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingResultId, setEditingResultId] = useState<string | null>(null);

  const multiDay = group.meet.startDate !== group.meet.endDate;

  function saveName() {
    const trimmed = nameDraft.trim();
    setEditingName(false);
    if (trimmed && trimmed !== group.meet.name) {
      db.meets.update(group.meet.id, { name: trimmed });
    }
  }

  function saveDates() {
    setEditingDates(false);
    const start = startDraft <= endDraft ? startDraft : endDraft;
    const end = startDraft <= endDraft ? endDraft : startDraft;
    db.meets.update(group.meet.id, { startDate: start, endDate: end });
  }

  return (
    <SwipeToDeleteRow onClick={() => setExpanded((v) => !v)} onDelete={onDelete}>
      <div className="py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-bg-elevated-2 text-accent">
            <Trophy size={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">
              {multiDay
                ? `${formatDateLabel(group.meet.startDate)} – ${formatDateLabel(group.meet.endDate)}`
                : formatDateLabel(group.meet.startDate)}
            </p>
            <p className="text-xs text-text-tertiary">
              {group.meet.name} · {group.results.length} event
              {group.results.length === 1 ? "" : "s"}
            </p>
          </div>
          <ChevronDown
            size={16}
            className={cn(
              "shrink-0 text-text-tertiary transition-transform",
              expanded && "rotate-180",
            )}
          />
        </div>

        {expanded && (
          // Interactive edit controls live inside the expanded panel, so
          // stop pointerdown here from reaching SwipeToDeleteRow's own
          // gesture handler — otherwise every tap inside also toggles
          // (and re-collapses) this row via its outer onClick.
          <div onPointerDown={(e) => e.stopPropagation()} className="mt-2 space-y-3 pl-[60px]">
            <div className="flex flex-wrap items-center gap-3">
              {editingName ? (
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onBlur={saveName}
                  className="h-7 min-w-0 flex-1 rounded border border-border bg-bg-elevated-2 px-1.5 text-xs text-text-primary outline-none focus:border-accent"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(group.meet.name);
                    setEditingName(true);
                  }}
                  className="text-xs text-accent active:opacity-70"
                >
                  Edit name
                </button>
              )}
              {editingDates ? (
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    autoFocus
                    value={startDraft}
                    onChange={(e) => setStartDraft(e.target.value)}
                    onBlur={saveDates}
                    className="h-7 rounded border border-border bg-bg-elevated-2 px-1 text-xs text-text-primary outline-none focus:border-accent"
                  />
                  <span className="text-text-tertiary">–</span>
                  <input
                    type="date"
                    value={endDraft}
                    onChange={(e) => setEndDraft(e.target.value)}
                    onBlur={saveDates}
                    className="h-7 rounded border border-border bg-bg-elevated-2 px-1 text-xs text-text-primary outline-none focus:border-accent"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setStartDraft(group.meet.startDate);
                    setEndDraft(group.meet.endDate);
                    setEditingDates(true);
                  }}
                  className="text-xs text-accent active:opacity-70"
                >
                  Edit dates
                </button>
              )}
            </div>

            <ul className="space-y-2">
              {group.results.map((r) =>
                editingResultId === r.id ? (
                  <li key={r.id}>
                    <MeetResultForm
                      meetId={group.meet.id}
                      meet={group.meet}
                      initial={r}
                      onCancel={() => setEditingResultId(null)}
                      onDone={() => setEditingResultId(null)}
                    />
                  </li>
                ) : (
                  <li key={r.id} className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setEditingResultId(r.id)}
                      className="min-w-0 flex-1 truncate text-left text-text-secondary active:opacity-70"
                    >
                      {eventLabel(r.event, r.course)}
                      {r.round !== "timed-final" && ` · ${ROUND_LABEL[r.round]}`}
                    </button>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="tabular-nums text-text-tertiary">
                        {formatTime(r.timeSeconds)} · {r.course}
                        {r.strokeCount !== null && ` · ${r.strokeCount} strk`}
                      </span>
                      <button
                        type="button"
                        onClick={() => db.meetResults.delete(r.id)}
                        className="text-text-tertiary active:opacity-70"
                      >
                        &times;
                      </button>
                    </div>
                  </li>
                ),
              )}
            </ul>

            {showAddEvent ? (
              <MeetResultForm
                meetId={group.meet.id}
                meet={group.meet}
                onCancel={() => setShowAddEvent(false)}
                onDone={() => setShowAddEvent(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowAddEvent(true)}
                className="flex items-center gap-1 rounded-lg border border-dashed border-border px-2 py-1 text-xs text-text-tertiary active:opacity-70"
              >
                <Plus size={12} /> Add event
              </button>
            )}
          </div>
        )}
      </div>
    </SwipeToDeleteRow>
  );
}

function LiftRow({
  lift,
  onClick,
  onDelete,
}: {
  lift: CalendarEvent;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <SwipeToDeleteRow onClick={onClick} onDelete={onDelete}>
      <div className="flex items-center gap-3 py-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-bg-elevated-2 text-warning">
          <Dumbbell size={20} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-text-primary">{formatDateLabel(lift.date)}</p>
          <p className="text-xs text-text-tertiary">{lift.title}</p>
        </div>
        <Badge tone={lift.completed ? "accent" : "neutral"}>
          {lift.completed ? "Done" : "Planned"}
        </Badge>
      </div>
    </SwipeToDeleteRow>
  );
}

function QuickAddPanel({
  onNewPractice,
  onDone,
}: {
  onNewPractice: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"menu" | "meet" | "lift">("menu");

  if (mode === "meet") {
    return <MeetResultForm onCancel={() => setMode("menu")} onDone={onDone} />;
  }
  if (mode === "lift") {
    return <LiftQuickForm onCancel={() => setMode("menu")} onDone={onDone} />;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onNewPractice}
        className="flex items-center gap-1 rounded-lg border border-dashed border-border px-2 py-1 text-xs text-text-tertiary active:opacity-70"
      >
        <ListPlus size={12} /> Practice
      </button>
      <button
        type="button"
        onClick={() => setMode("meet")}
        className="flex items-center gap-1 rounded-lg border border-dashed border-border px-2 py-1 text-xs text-text-tertiary active:opacity-70"
      >
        <Trophy size={12} /> Meet
      </button>
      <button
        type="button"
        onClick={() => setMode("lift")}
        className="flex items-center gap-1 rounded-lg border border-dashed border-border px-2 py-1 text-xs text-text-tertiary active:opacity-70"
      >
        <Dumbbell size={12} /> Lift
      </button>
    </div>
  );
}

function LiftQuickForm({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const [date, setDate] = useState(todayISO());
  const [title, setTitle] = useState("Lift");

  async function save() {
    if (!title.trim()) return;
    await db.calendarEvents.put({
      id: newId(),
      date,
      type: "lift",
      title: title.trim(),
      completed: false,
    });
    onDone();
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border p-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Title">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Legs + core"
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={save}>
          Add
        </Button>
      </div>
    </div>
  );
}
