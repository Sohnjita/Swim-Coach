"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Layers, ChevronRight, Upload } from "lucide-react";
import { db, SCORING_CONFIG_ID } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { buildRepHistory, DEFAULT_SCORING_CONFIG, scorePractice } from "@/lib/scoring";
import { practiceSummaryLine } from "@/lib/practiceHelpers";
import { formatDateLabel } from "@/lib/format";

export default function PracticesPage() {
  const practices = useLiveQuery(
    () => db.practices.orderBy("date").reverse().toArray(),
    [],
  );
  const scoringConfig =
    useLiveQuery(() => db.scoringConfig.get(SCORING_CONFIG_ID), []) ??
    DEFAULT_SCORING_CONFIG;

  const history = practices ? buildRepHistory(practices, scoringConfig) : [];

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
            <Link href="/practices/new">
              <Button variant="ghost" size="icon" aria-label="Log a practice">
                <Plus size={20} />
              </Button>
            </Link>
          </div>
        }
      />
      <div className="p-4">
        {!practices || practices.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            No practices logged yet. Tap + to log your first one.
          </p>
        ) : (
          <div className="divide-y divide-border/40">
            {practices.map((practice) => {
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
        )}
      </div>
    </div>
  );
}
