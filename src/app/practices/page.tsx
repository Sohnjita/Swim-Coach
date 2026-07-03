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
import { buildRepHistory, DEFAULT_SCORING_CONFIG, scorePractice } from "@/lib/scoring";
import { newPractice, practiceSummaryLine } from "@/lib/practiceHelpers";
import { formatDateLabel, todayISO } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  SORT_LABEL,
  sortPractices,
  toggleSortSpec,
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
  const [sortSpecs, setSortSpecs] = useState<SortSpec[]>([]);

  const history = practices ? buildRepHistory(practices, scoringConfig) : [];
  const sorted = practices
    ? sortPractices(practices, sortSpecs, history, scoringConfig)
    : [];

  async function handleNewPractice() {
    const practice = newPractice(todayISO());
    await db.practices.put(practice);
    router.push(`/practices/detail?id=${practice.id}`);
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
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-text-tertiary">Sort</span>
              {SORT_KEYS.map((key) => {
                const spec = sortSpecs.find((s) => s.key === key);
                const order = spec ? sortSpecs.indexOf(spec) + 1 : null;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSortSpecs((prev) => toggleSortSpec(prev, key))}
                    className={cn(
                      "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs whitespace-nowrap transition-colors",
                      spec
                        ? "bg-accent text-accent-text font-medium"
                        : "bg-bg-elevated-2 text-text-secondary border border-border",
                    )}
                  >
                    {sortSpecs.length > 1 && order && (
                      <span className="text-[10px] opacity-80">{order}</span>
                    )}
                    {SORT_LABEL[key]}
                    {spec &&
                      (spec.dir === "asc" ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
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
                <Link
                  key={practice.id}
                  href={`/practices/detail?id=${practice.id}`}
                  className="flex items-center gap-3 py-3"
                >
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
                </Link>
              );
            })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
