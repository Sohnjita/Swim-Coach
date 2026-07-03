"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Layers, ChevronRight, Upload, ArrowDown, ArrowUp } from "lucide-react";
import { db, SCORING_CONFIG_ID } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { SwipeToDeleteRow } from "@/components/ui/SwipeToDeleteRow";
import { buildRepHistory, DEFAULT_SCORING_CONFIG, scorePractice } from "@/lib/scoring";
import { newPractice, practiceSummaryLine } from "@/lib/practiceHelpers";
import { formatDateLabel, todayISO } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  SORT_LABEL,
  sortPractices,
  toggleSort,
  type SortKey,
  type SortSpec,
} from "@/lib/practiceSort";

const SORT_KEYS: SortKey[] = ["date", "score", "yardage", "type"];

export default function PracticesPage() {
  const router = useRouter();
  const practices = useLiveQuery(
    () => db.practices.orderBy("date").reverse().toArray(),
    [],
  );
  const scoringConfig =
    useLiveQuery(() => db.scoringConfig.get(SCORING_CONFIG_ID), []) ??
    DEFAULT_SCORING_CONFIG;
  const [sortSpec, setSortSpec] = useState<SortSpec | null>(null);

  const history = practices ? buildRepHistory(practices, scoringConfig) : [];
  const sorted = practices
    ? sortPractices(practices, sortSpec, history, scoringConfig)
    : [];

  async function handleNewPractice() {
    const practice = newPractice(todayISO());
    await db.practices.put(practice);
    router.push(`/practices/detail?id=${practice.id}&new=1`);
  }

  async function handleDeletePractice(id: string) {
    if (!confirm("Delete this practice? This cannot be undone.")) return;
    await db.practices.delete(id);
  }

  return (
    <div>
      <PageHeader
        title="Practices"
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
              aria-label="Log a practice"
              onClick={handleNewPractice}
            >
              <Plus size={20} />
            </Button>
          </div>
        }
      />
      <div className="p-4">
        {!practices || practices.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            No practices logged yet. Tap + to log your first one.
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              {SORT_KEYS.map((key) => {
                const active = sortSpec?.key === key;
                // Up always means "the more-prominent end is first": closer
                // (more recent) dates for Date, higher values for
                // Score/Yardage/Type. Both read as desc under the hood
                // (Date's "closer" and everyone else's "higher" are both the
                // larger raw value), so "up" is simply dir === "desc".
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
            <div className="divide-y divide-border/40">
            {sorted.map((practice) => {
              const { practiceScore } =
                scoringConfig
                  ? scorePractice(practice, history, scoringConfig)
                  : { practiceScore: null };
              return (
                <SwipeToDeleteRow
                  key={practice.id}
                  onClick={() => router.push(`/practices/detail?id=${practice.id}`)}
                  onDelete={() => handleDeletePractice(practice.id)}
                >
                  <div className="flex items-center gap-3 py-3">
                    <ScoreRing score={practiceScore} size={48} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        {formatDateLabel(practice.date)}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {practice.course} · {practiceSummaryLine(practice)}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-text-tertiary" />
                  </div>
                </SwipeToDeleteRow>
              );
            })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
