"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { parseBatchPracticeText } from "@/lib/practiceImport";
import { countReps, totalDistance } from "@/lib/lineTree";
import { formatDateLabel } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { NotationDocument } from "@/components/practice/NotationDocument";
import type { Practice } from "@/lib/types";

const PLACEHOLDER = `Date: 2026-06-15
Course: SCY
Sleep: 7.5
Weight: 165
RPE: 7
Gym: yes

Warm up (aerobic)
4x100 free easy
2x200 IM drill

Main (threshold)
2x[
4x100 on 1:30 breast
50 easy
]

Cool down
200 easy choice

--- (separate multiple practices with a line of just dashes)`;

export default function ImportPracticesPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);

  const parsed = useMemo<Practice[]>(() => {
    if (!text.trim()) return [];
    try {
      return parseBatchPracticeText(text);
    } catch {
      return [];
    }
  }, [text]);

  async function handleImport() {
    if (parsed.length === 0) return;
    setImporting(true);
    await db.practices.bulkPut(parsed);
    setImporting(false);
    if (parsed.length === 1) {
      router.push(`/practices/detail?id=${parsed[0].id}`);
    } else {
      router.push("/practices");
    }
  }

  return (
    <div>
      <PageHeader title="Import practices" />
      <div className="space-y-4 p-4 pb-24">
        <Card>
          <CardTitle className="mb-2">Paste practice text</CardTitle>
          <p className="mb-3 text-xs text-text-tertiary">
            Optional header lines (Date, Course, Sleep, Weight, RPE, Gym,
            Notes), then one or more blocks — a label like{" "}
            <span className="font-mono">Main (threshold)</span> followed by
            set lines, separated by blank lines. Paste several practices at
            once by separating each with a line of just{" "}
            <span className="font-mono">---</span>.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={12}
            spellCheck={false}
            className="w-full resize-y rounded-xl border border-border bg-bg-elevated-2 p-3 font-mono text-[13px] leading-6 text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent"
          />
        </Card>

        {parsed.length > 0 && (
          <div className="divide-y divide-border/40 [&>*+*]:pt-5">
            <p className="px-1 text-xs font-medium text-text-tertiary">
              {parsed.length} practice{parsed.length > 1 ? "s" : ""} parsed
            </p>
            {parsed.map((practice) => (
              <div key={practice.id}>
                <div className="mb-2 flex items-center justify-between">
                  <CardTitle>{formatDateLabel(practice.date)}</CardTitle>
                  <Badge>{practice.course}</Badge>
                </div>
                <div className="space-y-3">
                  {practice.sets.map((set) => (
                    <div key={set.id}>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">
                          {set.label}
                        </span>
                        <Badge className="capitalize">{set.type}</Badge>
                        <span className="text-xs text-text-tertiary">
                          {countReps(set.lines)} reps ·{" "}
                          {totalDistance(set.lines).toLocaleString()}{" "}
                          {practice.course === "SCY" ? "yd" : "m"}
                        </span>
                      </div>
                      <NotationDocument lines={set.lines} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleImport}
          disabled={parsed.length === 0 || importing}
        >
          {importing
            ? "Importing..."
            : parsed.length > 0
              ? `Import ${parsed.length} practice${parsed.length > 1 ? "s" : ""}`
              : "Paste text above to preview"}
        </Button>
      </div>
    </div>
  );
}
