"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight } from "lucide-react";
import { db, SCORING_CONFIG_ID } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { ScoreRing } from "@/components/ui/ScoreRing";
import {
  buildRepHistory,
  DEFAULT_SCORING_CONFIG,
  predictGoalTimes,
  scorePractice,
} from "@/lib/scoring";
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
  const standards = useLiveQuery(() => db.standards.toArray(), []);

  const history = practices ? buildRepHistory(practices, scoringConfig) : [];

  const recentScored = practices
    ? practices
        .slice(0, 5)
        .map((p) => ({ practice: p, ...scorePractice(p, history, scoringConfig) }))
    : [];

  const predictions = practices ? predictGoalTimes(practices, scoringConfig) : [];

  return (
    <div>
      <PageHeader title="Analyze" />

      <div className="space-y-4 p-4">
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
            <ul className="space-y-3">
              {recentScored.map(({ practice, practiceScore }) => (
                <li key={practice.id}>
                  <Link
                    href={`/practices/detail?id=${practice.id}`}
                    className="flex items-center gap-3"
                  >
                    <ScoreRing score={practiceScore} size={44} />
                    <div className="flex-1">
                      <p className="text-sm text-text-primary">
                        {formatDateLabel(practice.date)}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {practice.course} · {practice.sets.length} sets
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
            {predictions.map((pred) => {
              const standard = standards?.find((s) => s.event === pred.event);
              return (
                <div key={pred.event} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-text-primary">{pred.event}</p>
                    <p className="text-xs text-text-tertiary">
                      {pred.basedOnDate
                        ? `Best effort ${formatDateLabel(pred.basedOnDate)}`
                        : "No sprint/lactate reps logged yet"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-text-primary">
                      {formatTime(pred.predictedTaperedSeconds)}
                    </p>
                    {standard && pred.predictedTaperedSeconds !== null && (
                      <p
                        className={
                          pred.predictedTaperedSeconds <= standard.timeSeconds
                            ? "text-xs text-accent"
                            : "text-xs text-text-tertiary"
                        }
                      >
                        {pred.predictedTaperedSeconds <= standard.timeSeconds
                          ? "under cut"
                          : `+${(pred.predictedTaperedSeconds - standard.timeSeconds).toFixed(2)}s off cut`}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
