"use client";

import { useMemo, useState } from "react";
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
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { db, newId } from "@/lib/db";
import type { CalendarEventType } from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/cn";
import { formatDateLabel, todayISO } from "@/lib/format";

const EVENT_TYPES: { label: string; value: CalendarEventType; dot: string }[] = [
  { label: "Swim", value: "swim", dot: "var(--accent)" },
  { label: "Lift", value: "lift", dot: "var(--warning)" },
  { label: "Meal", value: "meal", dot: "var(--dot-meal)" },
  { label: "Sleep", value: "sleep", dot: "var(--dot-sleep)" },
  { label: "Meet", value: "meet", dot: "var(--danger)" },
];

function dotColor(type: CalendarEventType) {
  return EVENT_TYPES.find((t) => t.value === type)?.dot ?? "var(--text-tertiary)";
}

export default function CalendarPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(todayISO());
  const [showNew, setShowNew] = useState(false);

  const events = useLiveQuery(() => db.calendarEvents.toArray(), []);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const ev of events ?? []) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list as NonNullable<typeof events>);
    }
    return map;
  }, [events]);

  const selectedEvents = eventsByDate.get(selected) ?? [];

  async function toggleCompleted(id: string, completed: boolean) {
    await db.calendarEvents.update(id, { completed: !completed });
  }

  async function removeEvent(id: string) {
    await db.calendarEvents.delete(id);
  }

  return (
    <div>
      <PageHeader
        title="Calendar"
        action={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setMonth((m) => subMonths(m, 1))}>
              <ChevronLeft size={18} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))}>
              <ChevronRight size={18} />
            </Button>
          </div>
        }
      />

      <div className="space-y-4 p-4">
        <p className="text-center text-sm font-medium text-text-secondary">
          {format(month, "MMMM yyyy")}
        </p>

        <div className="grid grid-cols-7 gap-1 text-center">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-xs text-text-tertiary">
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
                onClick={() => setSelected(iso)}
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
                <div className="flex gap-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <span
                      key={ev!.id}
                      className="h-1 w-1 rounded-full"
                      style={{ backgroundColor: dotColor(ev!.type) }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <CardTitle>{formatDateLabel(selected)}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setShowNew((v) => !v)}>
              <Plus size={18} />
            </Button>
          </div>

          {showNew && (
            <NewEventForm
              date={selected}
              onDone={() => setShowNew(false)}
            />
          )}

          {selectedEvents.length === 0 && !showNew ? (
            <p className="text-sm text-text-tertiary">Nothing planned.</p>
          ) : (
            <ul className="space-y-2">
              {selectedEvents.map((ev) => (
                <li
                  key={ev!.id}
                  className="flex items-center gap-2 rounded-lg border border-border p-2"
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: dotColor(ev!.type) }}
                  />
                  <div className="flex-1">
                    <p className="text-sm text-text-primary">{ev!.title}</p>
                    {ev!.startTime && (
                      <p className="text-xs text-text-tertiary">
                        {ev!.startTime}
                        {ev!.durationMinutes ? ` · ${ev!.durationMinutes} min` : ""}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => toggleCompleted(ev!.id, ev!.completed)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-xs",
                      ev!.completed
                        ? "border-accent text-accent"
                        : "border-border text-text-tertiary",
                    )}
                  >
                    {ev!.completed ? "Done" : "Mark done"}
                  </button>
                  <button
                    onClick={() => removeEvent(ev!.id)}
                    className="p-1 text-text-tertiary"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function NewEventForm({ date, onDone }: { date: string; onDone: () => void }) {
  const [type, setType] = useState<CalendarEventType>("swim");
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("");

  async function save() {
    if (!title.trim()) return;
    await db.calendarEvents.put({
      id: newId(),
      date,
      type,
      title: title.trim(),
      startTime: startTime || undefined,
      durationMinutes: duration ? Number(duration) : undefined,
      completed: false,
    });
    onDone();
  }

  return (
    <div className="mb-3 space-y-2 rounded-lg border border-dashed border-border p-2">
      <Segmented
        options={EVENT_TYPES.map((t) => ({ label: t.label, value: t.value }))}
        value={type}
        onChange={setType}
      />
      <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <Input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />
        <Input
          inputMode="numeric"
          placeholder="Duration (min)"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onDone}>
          Cancel
        </Button>
        <Button size="sm" className="flex-1" onClick={save}>
          Add
        </Button>
      </div>
    </div>
  );
}
