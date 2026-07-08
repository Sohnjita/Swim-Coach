"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight } from "lucide-react";
import { db, SCORING_CONFIG_ID } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { TrainingPowerIndex } from "@/components/analyze/TrainingPowerIndex";
import { DEFAULT_SCORING_CONFIG, predictGoalTimes } from "@/lib/scoring";
import { practiceSummaryLine } from "@/lib/practiceHelpers";
import { formatDateLabel } from "@/lib/format";
import { formatTime } from "@/lib/conversions";

export default function AnalyzePage() {
  const practices = useLiveQuery(
    () => db.practices.orderBy("date").reverse().limit(30).toArray(),
    [],
  );
  const scoringConfig =
    useLiveQuery(() => db.scoringConfig.get(SCORING_CONFIG_ID), []) ??
    DEFAULT_SCORING_CONFIG;

  const recentScored = practices ? practices.slice(0, 5) : [];

  const predictions = practices ? predictGoalTimes(practices, scoringConfig) : [];

  return (
    <div>
      <PageHeader title="Analyze" />

      <div className="divide-y divide-border/40 p-4 [&>*+*]:pt-6">
        <TrainingPowerIndex />

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Recent practice scores</CardTitle>
            <Link href="/practices" className="text-xs text-accent">
              See all
            </Link>
          </div>
          {recentScored.length === 0 ? (
            <p className="text-sm text-text-tertiary">
              Log your first practice to start tracking your score.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {recentScored.map((practice) => (
                <li key={practice.id}>
                  <Link
                    href={`/practices/detail?id=${practice.id}`}
                    className="flex items-center gap-3 py-2"
                  >
                    <ScoreRing score={practice.practiceScore} size={44} />
                    <div className="flex-1">
                      <p className="text-sm text-text-primary">
                        {formatDateLabel(practice.date)}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {practice.course} · {practiceSummaryLine(practice)}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-text-tertiary" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Goal time projection</CardTitle>
            <Link href="/times" className="text-xs text-accent">
              Times
            </Link>
          </div>
          <div className="space-y-3">
            {predictions.map((pred) => (
              <div key={pred.event} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-primary">{pred.event}</p>
                  <p className="text-xs text-text-tertiary">
                    {pred.basedOnDate
                      ? `Best effort ${formatDateLabel(pred.basedOnDate)}`
                      : "No sprint/lactate reps logged yet"}
                  </p>
                </div>
                <p className="text-sm font-medium text-text-primary">
                  {formatTime(pred.predictedTaperedSeconds)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
