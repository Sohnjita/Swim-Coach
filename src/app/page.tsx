"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatDateLabel, todayISO } from "@/lib/format";

export default function DashboardPage() {
  const todaysEvents = useLiveQuery(
    () => db.calendarEvents.where("date").equals(todayISO()).toArray(),
    [],
  );

  return (
    <div>
      <PageHeader title="Swim Coach" subtitle={formatDateLabel(todayISO())} />

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
      </div>
    </div>
  );
}
