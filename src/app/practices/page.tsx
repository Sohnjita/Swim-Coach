"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, ChevronRight } from "lucide-react";
import { db, SCORING_CONFIG_ID } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { buildRepHistory, DEFAULT_SCORING_CONFIG, scorePractice } from "@/lib/scoring";
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
        title="Practice Log"
        action={
          <Link href="/practices/new">
            <Button variant="ghost" size="icon">
              <Plus size={20} />
            </Button>
          </Link>
        }
      />
      <div className="space-y-3 p-4">
        {!practices || practices.length === 0 ? (
          <Card>
            <p className="text-sm text-text-tertiary">
              No practices logged yet. Tap + to log your first one.
            </p>
          </Card>
        ) : (
          practices.map((practice) => {
            const { practiceScore } =
              scoringConfig
                ? scorePractice(practice, history, scoringConfig)
                : { practiceScore: null };
            return (
              <Link key={practice.id} href={`/practices/${practice.id}`}>
                <Card className="flex items-center gap-3">
                  <ScoreRing score={practiceScore} size={48} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text-primary">
                      {formatDateLabel(practice.date)}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {practice.course} · {practice.sets.length} sets ·{" "}
                      {practice.sets.reduce((n, s) => n + s.reps.length, 0)} reps
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-text-tertiary" />
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
