"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Pencil, Trash2 } from "lucide-react";
import { db, SCORING_CONFIG_ID } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Badge } from "@/components/ui/Badge";
import { buildRepHistory, DEFAULT_SCORING_CONFIG, scorePractice, scoreSet } from "@/lib/scoring";
import { formatDateLabel } from "@/lib/format";
import { formatTime } from "@/lib/conversions";

export default function PracticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const practice = useLiveQuery(() => db.practices.get(id), [id]);
  const allPractices = useLiveQuery(() => db.practices.toArray(), []);
  const scoringConfig =
    useLiveQuery(() => db.scoringConfig.get(SCORING_CONFIG_ID), []) ??
    DEFAULT_SCORING_CONFIG;

  if (practice === undefined || allPractices === undefined) {
    return null;
  }
  if (practice === null || !practice) {
    return (
      <div className="p-4">
        <p className="text-sm text-text-tertiary">Practice not found.</p>
      </div>
    );
  }

  const history = buildRepHistory(allPractices, scoringConfig);
  const { practiceScore } = scorePractice(practice, history, scoringConfig);

  async function handleDelete() {
    if (!confirm("Delete this practice? This cannot be undone.")) return;
    await db.practices.delete(id);
    router.push("/practices");
  }

  return (
    <div>
      <PageHeader
        title={formatDateLabel(practice.date)}
        subtitle={`${practice.course} · ${practice.sets.length} sets`}
        action={
          <div className="flex gap-1">
            <Link href={`/practices/${id}/edit`}>
              <Button variant="ghost" size="icon">
                <Pencil size={18} />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleDelete}>
              <Trash2 size={18} />
            </Button>
          </div>
        }
      />

      <div className="space-y-4 p-4">
        <Card className="flex items-center gap-4">
          <ScoreRing score={practiceScore} size={64} label="score" />
          <div>
            <p className="text-sm text-text-primary">Practice score</p>
            <p className="text-xs text-text-tertiary">
              Weighted across sets (sprint/lactate count more toward race prediction)
            </p>
          </div>
        </Card>

        {practice.sets.map((set) => {
          const { repScores, setScore } = scoreSet(
            set,
            practice.course,
            history,
            scoringConfig,
          );
          return (
            <Card key={set.id}>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <CardTitle>{set.label || set.type}</CardTitle>
                  <Badge tone="neutral" className="mt-1 capitalize">
                    {set.type}
                  </Badge>
                </div>
                {setScore !== null && <ScoreRing score={setScore} size={40} />}
              </div>
              <div className="space-y-1">
                {set.reps.map((rep) => {
                  const scored = repScores.find((r) => r.repId === rep.id);
                  return (
                    <div
                      key={rep.id}
                      className="flex items-center justify-between border-t border-border py-1.5 text-sm first:border-0"
                    >
                      <span className="text-text-tertiary">#{rep.repIndex}</span>
                      <span className="text-text-primary">
                        {rep.distance} {rep.stroke}
                      </span>
                      <span className="tabular-nums text-text-primary">
                        {formatTime(rep.time)}
                      </span>
                      <span className="w-10 text-right text-xs text-text-tertiary">
                        {scored?.compositeScore !== null && scored?.compositeScore !== undefined
                          ? Math.round(scored.compositeScore)
                          : "--"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}

        <Card>
          <CardTitle className="mb-2">Context</CardTitle>
          <dl className="grid grid-cols-2 gap-y-1 text-sm">
            <dt className="text-text-tertiary">Sleep</dt>
            <dd className="text-text-primary">
              {practice.sleepHours !== null ? `${practice.sleepHours} hrs` : "--"}
            </dd>
            <dt className="text-text-tertiary">Body weight</dt>
            <dd className="text-text-primary">
              {practice.bodyWeightKg !== null ? `${practice.bodyWeightKg} kg` : "--"}
            </dd>
            <dt className="text-text-tertiary">Gym that day</dt>
            <dd className="text-text-primary">{practice.gymThatDay ? "Yes" : "No"}</dd>
            <dt className="text-text-tertiary">Overall RPE</dt>
            <dd className="text-text-primary">{practice.overallRpe ?? "--"}</dd>
          </dl>
          {practice.notes && (
            <p className="mt-2 text-sm text-text-secondary">{practice.notes}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
