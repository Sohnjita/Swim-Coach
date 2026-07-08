"use client";

import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import { Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatLines } from "@/lib/lineTree";
import { newPractice } from "@/lib/practiceHelpers";
import { todayISO } from "@/lib/format";
import {
  FOCUS_LABEL,
  mostRecentCourse,
  recommendationToPracticeSet,
  recommendSet,
} from "@/lib/setRecommendation";

/**
 * "What should I do today" card — recommends a set-type focus (and either a
 * matching saved set or a freshly generated one) from the last two weeks of
 * logged practices/meets. See setRecommendation.ts for the reasoning.
 */
export function SetRecommendationCard() {
  const router = useRouter();
  const practices = useLiveQuery(() => db.practices.toArray(), []) ?? [];
  const meets = useLiveQuery(() => db.meets.toArray(), []) ?? [];
  const setTemplates = useLiveQuery(() => db.setTemplates.toArray(), []) ?? [];

  const today = todayISO();
  const recommendation = recommendSet(practices, meets, setTemplates, today);
  const preview = formatLines(recommendation.lines);
  const todayPractice = practices.find((p) => p.date === today);

  async function handleStart() {
    const set = recommendationToPracticeSet(recommendation);
    if (todayPractice) {
      await db.practices.put({ ...todayPractice, sets: [...todayPractice.sets, set] });
      router.push(`/practices/detail?id=${todayPractice.id}`);
      return;
    }
    const course = mostRecentCourse(practices);
    const practice = newPractice(today, course, set);
    await db.practices.put(practice);
    router.push(`/practices/detail?id=${practice.id}&new=1`);
  }

  return (
    <Card className="rounded-xl border border-border bg-bg-elevated-2/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <CardTitle className="flex items-center gap-1.5 normal-case tracking-normal text-text-secondary">
          <Sparkles size={13} className="text-accent" /> Today&apos;s suggestion
        </CardTitle>
        <Badge tone="accent" className="capitalize">
          {FOCUS_LABEL[recommendation.focus]}
        </Badge>
      </div>

      <p className="text-xs text-text-tertiary">{recommendation.reasoning[0]}</p>

      <div className="mt-2 rounded-lg border border-border bg-bg-elevated p-2 font-mono text-[13px] text-text-primary">
        <p className="text-xs font-sans font-medium text-text-secondary">{recommendation.label}</p>
        {preview.map((line, i) => (
          <p key={i} className="truncate">
            {line}
          </p>
        ))}
      </div>

      <Button size="sm" className="mt-3 w-full" onClick={handleStart}>
        {todayPractice ? "Add to today's practice" : "Start today's practice"}
      </Button>
    </Card>
  );
}
