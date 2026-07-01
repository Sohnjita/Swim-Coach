"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Settings, Plus, ChevronRight } from "lucide-react";
import { db, SCORING_CONFIG_ID } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Badge } from "@/components/ui/Badge";
import {
  buildRepHistory,
  DEFAULT_SCORING_CONFIG,
  predictGoalTimes,
  scorePractice,
} from "@/lib/scoring";
import { formatDateLabel, todayISO } from "@/lib/format";
import { formatTime } from "@/lib/conversions";

export default function DashboardPage() {
  const practices = useLiveQuery(
    () => db.practices.orderBy("date").reverse().limit(30).toArray(),
    [],
  );
  const scoringConfig =
    useLiveQuery(() => db.scoringConfig.get(SCORING_CONFIG_ID), []) ??
    DEFAULT_SCORING_CONFIG;
  const todaysEvents = useLiveQuery(
    () => db.calendarEvents.where("date").equals(todayISO()).toArray(),
    [],
  );
  const standards = useLiveQuery(() => db.standards.toArray(), []);

  const history = practices ? buildRepHistory(practices, scoringConfig) : [];

  const recentScored =
    practices && scoringConfig
      ? practices
          .slice(0, 5)
          .map((p) => ({ practice: p, ...scorePractice(p, history, scoringConfig) }))
      : [];

  const predictions =
    practices && scoringConfig ? predictGoalTimes(practices, scoringConfig) : [];

  return (
    <div>
      <PageHeader
        title="Swim Coach"
        subtitle={formatDateLabel(todayISO())}
        action={
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <Settings size={20} />
            </Button>
          </Link>
        }
      />

      <div className="space-y-4 p-4">
        <Link href="/practices/new">
          <Button className="w-full">
            <Plus size={18} /> Log a practice
          </Button>
        </Link>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Today</CardTitle>
            <Link href="/calendar" className="text-xs text-accent">
              Calendar
            </Link>
          </div>
          {!todaysEvents || todaysEvents.length === 0 ? (
            <p className="text-sm text-text-tertiary">Nothing planned today.</p>
          ) : (
            <ul className="space-y-2">
              {todaysEvents.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-text-primary">{ev.title}</span>
                  <Badge tone={ev.completed ? "accent" : "neutral"}>
                    {ev.type}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

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
                    href={`/practices/${practice.id}`}
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
