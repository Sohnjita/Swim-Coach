"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveQuery } from "dexie-react-hooks";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Dumbbell, ListPlus, Trophy } from "lucide-react";
import { db, newId } from "@/lib/db";
import type { CalendarEventType } from "@/lib/types";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { formatDateLabel, todayISO } from "@/lib/format";

const EVENT_DOT: Record<CalendarEventType, string> = {
  swim: "var(--accent)",
  lift: "var(--warning)",
  meal: "var(--dot-meal)",
  sleep: "var(--dot-sleep)",
  meet: "var(--danger)",
};

export function HomeCalendar() {
  const router = useRouter();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(todayISO());
  const [loggingLift, setLoggingLift] = useState(false);

  const events = useLiveQuery(() => db.calendarEvents.toArray(), []);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, NonNullable<typeof events>>();
    for (const ev of events ?? []) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [events]);

  const selectedEvents = eventsByDate.get(selected) ?? [];

  function selectDay(iso: string) {
    setSelected(iso);
    setLoggingLift(false);
  }

  function logPractice() {
    router.push(`/practices/new?date=${selected}`);
  }

  function logMeet() {
    router.push(`/times?date=${selected}&addResult=1`);
  }

  async function addLift(title: string) {
    if (!title.trim()) return;
    await db.calendarEvents.put({
      id: newId(),
      date: selected,
      type: "lift",
      title: title.trim(),
      completed: false,
    });
    setLoggingLift(false);
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth((m) => subMonths(m, 1))}
          className="p-1 text-text-tertiary active:opacity-70"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-medium text-text-secondary">{format(month, "MMMM yyyy")}</p>
        <button
          type="button"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="p-1 text-text-tertiary active:opacity-70"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-[10px] text-text-tertiary">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate.get(iso) ?? [];
          const inMonth = isSameMonth(day, month);
          return (
            <button
              key={iso}
              type="button"
              onClick={() => selectDay(iso)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg py-1.5",
                selected === iso && "bg-bg-elevated-2 border border-accent",
                !inMonth && "opacity-30",
              )}
            >
              <span
                className={cn(
                  "text-xs",
                  isToday(day) ? "font-semibold text-accent" : "text-text-primary",
                )}
              >
                {format(day, "d")}
              </span>
              <div className="flex h-1 gap-0.5">
                {dayEvents.slice(0, 3).map((ev) => (
                  <span
                    key={ev.id}
                    className="h-1 w-1 rounded-full"
                    style={{ backgroundColor: EVENT_DOT[ev.type] }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <CardTitle className="mb-2">{formatDateLabel(selected)}</CardTitle>

        {selectedEvents.length > 0 && (
          <ul className="mb-2 space-y-1.5">
            {selectedEvents.map((ev) => (
              <li key={ev.id} className="flex items-center gap-2 text-sm">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: EVENT_DOT[ev.type] }}
                />
                <span className="flex-1 text-text-primary">{ev.title}</span>
                <Badge tone={ev.completed ? "accent" : "neutral"}>{ev.type}</Badge>
              </li>
            ))}
          </ul>
        )}

        {loggingLift ? (
          <LiftForm onCancel={() => setLoggingLift(false)} onSave={addLift} />
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" className="flex-1" onClick={logPractice}>
              <ListPlus size={14} /> Practice
            </Button>
            <Button variant="secondary" size="sm" className="flex-1" onClick={logMeet}>
              <Trophy size={14} /> Meet
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setLoggingLift(true)}
            >
              <Dumbbell size={14} /> Lift
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function LiftForm({
  onSave,
  onCancel,
}: {
  onSave: (title: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("Lift");

  return (
    <div className="flex gap-2">
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Lift (e.g. Legs + core)"
        className="flex-1"
      />
      <Button variant="secondary" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button size="sm" onClick={() => onSave(title)}>
        Add
      </Button>
    </div>
  );
}
