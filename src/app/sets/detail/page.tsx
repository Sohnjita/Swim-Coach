"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Check, ChevronDown, Copy, Trash2 } from "lucide-react";
import { db, SCORING_CONFIG_ID } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { NotationDocument, type ProjectionContext } from "@/components/practice/NotationDocument";
import {
  appendItemToRound,
  formatLines,
  moveLineBy,
  removeLineById,
  updateLineById,
} from "@/lib/lineTree";
import { buildRepHistory, DEFAULT_SCORING_CONFIG } from "@/lib/scoring";
import type { Course, PracticeLine, SetTemplate, SetType } from "@/lib/types";

const SET_TYPES: SetType[] = ["aerobic", "threshold", "sprint", "lactate", "technique"];
const COURSES: { label: string; value: Course }[] = [
  { label: "SCY", value: "SCY" },
  { label: "SCM", value: "SCM" },
  { label: "LCM", value: "LCM" },
  { label: "Other", value: "Other" },
];

export default function SetTemplateDetailPage() {
  return (
    <Suspense fallback={null}>
      <SetTemplateDetailRouter />
    </Suspense>
  );
}

/** Keyed by id for the same reason as the practice detail page — see there. */
function SetTemplateDetailRouter() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const startEditingLabel = searchParams.get("new") === "1";
  return <SetTemplateDetail key={id} id={id} startEditingLabel={startEditingLabel} />;
}

function SetTemplateDetail({
  id,
  startEditingLabel,
}: {
  id: string;
  startEditingLabel: boolean;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [editingLabel, setEditingLabel] = useState(startEditingLabel);

  const template = useLiveQuery(() => db.setTemplates.get(id), [id]);
  const allPractices = useLiveQuery(() => db.practices.toArray(), []) ?? [];
  const scoringConfig =
    useLiveQuery(() => db.scoringConfig.get(SCORING_CONFIG_ID), []) ??
    DEFAULT_SCORING_CONFIG;

  if (template === undefined) return null;
  if (!template) {
    return (
      <div className="p-4">
        <p className="text-sm text-text-tertiary">Set not found.</p>
      </div>
    );
  }

  const currentTemplate: SetTemplate = template;
  const projectionContext: ProjectionContext = {
    history: buildRepHistory(allPractices, scoringConfig),
    config: scoringConfig,
    course: currentTemplate.course,
    setType: currentTemplate.type,
  };

  async function save(next: SetTemplate) {
    await db.setTemplates.put(next);
  }

  async function handleDelete() {
    if (!confirm("Delete this set? This cannot be undone.")) return;
    await db.setTemplates.delete(id);
    router.push("/sets");
  }

  async function handleCopy() {
    const text = formatLines(currentTemplate.lines).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function setLines(lines: PracticeLine[]) {
    save({ ...currentTemplate, lines });
  }

  function updateLine(lineId: string, next: PracticeLine) {
    setLines(updateLineById(currentTemplate.lines, lineId, next));
  }

  function deleteLine(lineId: string) {
    setLines(removeLineById(currentTemplate.lines, lineId));
  }

  function moveLine(lineId: string, delta: number) {
    setLines(moveLineBy(currentTemplate.lines, lineId, delta));
  }

  function addLine(line: PracticeLine, parentRoundId?: string) {
    const lines = parentRoundId
      ? appendItemToRound(currentTemplate.lines, parentRoundId, line)
      : [...currentTemplate.lines, line];
    setLines(lines);
  }

  function cycleType() {
    const idx = SET_TYPES.indexOf(currentTemplate.type);
    save({ ...currentTemplate, type: SET_TYPES[(idx + 1) % SET_TYPES.length] });
  }

  return (
    <div>
      <PageHeader
        leading={
          <Link href="/sets">
            <Button variant="ghost" size="icon" aria-label="Back to set library">
              <ArrowLeft size={18} />
            </Button>
          </Link>
        }
        title={template.label || "Set"}
        action={
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={handleCopy} aria-label="Copy set">
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDelete} aria-label="Delete set">
              <Trash2 size={18} />
            </Button>
          </div>
        }
      />

      <div className="p-4">
        <div className="mb-5 flex items-center gap-2">
          {editingLabel ? (
            <input
              autoFocus
              value={template.label}
              onChange={(e) => save({ ...currentTemplate, label: e.target.value })}
              onBlur={() => setEditingLabel(false)}
              placeholder="Set title"
              className="min-w-0 flex-1 bg-transparent text-base font-medium text-text-primary outline-none placeholder:font-normal placeholder:text-text-tertiary"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingLabel(true)}
              className="min-w-0 flex-1 truncate text-left text-base font-medium text-text-primary active:opacity-70"
            >
              {template.label || "Untitled set"}
            </button>
          )}
          <button type="button" onClick={cycleType} className="shrink-0 active:opacity-70">
            <Badge tone="neutral" className="capitalize">
              {template.type}
            </Badge>
          </button>
          <CourseField
            template={template}
            onCourseChange={(course) => save({ ...currentTemplate, course })}
          />
        </div>

        <NotationDocument
          lines={template.lines}
          onUpdateLine={updateLine}
          onDeleteLine={deleteLine}
          onMoveLine={moveLine}
          onAddLine={addLine}
          projectionContext={projectionContext}
        />
      </div>
    </div>
  );
}

function CourseField({
  template,
  onCourseChange,
}: {
  template: SetTemplate;
  onCourseChange: (course: Course) => void;
}) {
  return (
    <div className="relative flex shrink-0 items-center">
      <select
        value={template.course}
        onChange={(e) => onCourseChange(e.target.value as Course)}
        className="appearance-none bg-transparent pr-4 text-sm text-text-secondary outline-none"
      >
        {COURSES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-0 text-text-tertiary" />
    </div>
  );
}
