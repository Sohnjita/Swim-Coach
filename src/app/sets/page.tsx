"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, Plus, Sparkles } from "lucide-react";
import { db, SCORING_CONFIG_ID } from "@/lib/db";
import type { SetTemplate } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { countReps, findFirstRepsLine, totalDistance } from "@/lib/lineTree";
import { buildRepHistory, DEFAULT_SCORING_CONFIG } from "@/lib/scoring";
import { suggestSetVariation } from "@/lib/variations";
import { emptySetTemplate, makeSetFromTemplate, newPractice } from "@/lib/practiceHelpers";
import { todayISO } from "@/lib/format";

export default function SetsPage() {
  const router = useRouter();
  const templates = useLiveQuery(() => db.setTemplates.toArray(), []);
  const practices = useLiveQuery(() => db.practices.toArray(), []);
  const scoringConfig =
    useLiveQuery(() => db.scoringConfig.get(SCORING_CONFIG_ID), []) ??
    DEFAULT_SCORING_CONFIG;
  const [suggestionFor, setSuggestionFor] = useState<string | null>(null);

  const history = practices ? buildRepHistory(practices, scoringConfig) : [];

  async function handleNewTemplate() {
    const template = emptySetTemplate();
    await db.setTemplates.put(template);
    router.push(`/sets/detail?id=${template.id}&new=1`);
  }

  async function startPractice(template: SetTemplate) {
    const set = makeSetFromTemplate(template);
    const practice = newPractice(todayISO(), template.course, set);
    await db.practices.put(practice);
    router.push(`/practices/detail?id=${practice.id}&new=1`);
  }

  return (
    <div>
      <PageHeader
        title="Set Library"
        action={
          <Button variant="ghost" size="icon" aria-label="New set" onClick={handleNewTemplate}>
            <Plus size={20} />
          </Button>
        }
      />
      <div className="space-y-3 p-4">
        {!templates || templates.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            Save reusable sets here — e.g. &ldquo;8x100 Breast Descend&rdquo; — so
            you can write them once, get pace suggestions based on your
            history, and drop them into any practice.
          </p>
        ) : (
          <div className="divide-y divide-border/40">
            {templates.map((template) => {
              const repShape = findFirstRepsLine(template.lines);
              const suggestion =
                suggestionFor === template.id && repShape
                  ? suggestSetVariation(
                      {
                        distance: repShape.distance,
                        stroke: repShape.stroke ?? "free",
                        course: template.course,
                        baseIntervalSeconds: repShape.intervalSeconds,
                      },
                      history,
                    )
                  : null;
              return (
                <div key={template.id} className="py-3 first:pt-0">
                  <Link
                    href={`/sets/detail?id=${template.id}`}
                    className="mb-2 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {template.label || template.type}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {countReps(template.lines)} reps · {totalDistance(template.lines)}{" "}
                        {template.course === "SCY" ? "yd" : "m"} · {template.course}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone="neutral" className="capitalize">
                        {template.type}
                      </Badge>
                      <ChevronRight size={16} className="text-text-tertiary" />
                    </div>
                  </Link>

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
                      disabled={!repShape}
                      onClick={() =>
                        setSuggestionFor((cur) => (cur === template.id ? null : template.id))
                      }
                    >
                      <Sparkles size={14} /> Suggest
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={template.lines.length === 0}
                      onClick={() => startPractice(template)}
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
