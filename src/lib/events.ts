// The fixed 17-event catalog for the Times page. Kept separate from the
// older `CutEvent` (breast 50/100 only), which still drives the existing
// goal-projection scoring engine in scoring.ts — that system is untouched.

import type { Course, Stroke } from "./types";

export type SwimEvent =
  | "free-50"
  | "free-100"
  | "free-200"
  | "free-400-500"
  | "free-800-1000"
  | "free-1500-1650"
  | "back-50"
  | "back-100"
  | "back-200"
  | "breast-50"
  | "breast-100"
  | "breast-200"
  | "fly-50"
  | "fly-100"
  | "fly-200"
  | "im-200"
  | "im-400";

/** Display + ranking order, exactly as requested. */
export const SWIM_EVENTS: SwimEvent[] = [
  "free-50",
  "free-100",
  "free-200",
  "free-400-500",
  "free-800-1000",
  "free-1500-1650",
  "back-50",
  "back-100",
  "back-200",
  "breast-50",
  "breast-100",
  "breast-200",
  "fly-50",
  "fly-100",
  "fly-200",
  "im-200",
  "im-400",
];

export type StrokeCategory = "free" | "back" | "breast" | "fly" | "im";

export const STROKE_CATEGORIES: StrokeCategory[] = ["free", "back", "breast", "fly", "im"];

export const STROKE_CATEGORY_LABEL: Record<StrokeCategory, string> = {
  free: "Free",
  back: "Back",
  breast: "Breast",
  fly: "Fly",
  im: "IM",
};

export function eventCategory(event: SwimEvent): StrokeCategory {
  return event.split("-")[0] as StrokeCategory;
}

export function eventsInCategory(category: StrokeCategory): SwimEvent[] {
  return SWIM_EVENTS.filter((e) => eventCategory(e) === category);
}

export function eventStroke(event: SwimEvent): Stroke {
  const category = eventCategory(event);
  return category === "im" ? "im" : category;
}

/**
 * The three long-freestyle events swap distance (and label) by course, the
 * way USA Swimming actually programs them — 500/1000/1650 are yards-only,
 * 400/800/1500 are meters-only. Every other event is the same number
 * regardless of course.
 */
const LONG_FREE_DISTANCE: Record<"free-400-500" | "free-800-1000" | "free-1500-1650", { scy: number; meters: number }> = {
  "free-400-500": { scy: 500, meters: 400 },
  "free-800-1000": { scy: 1000, meters: 800 },
  "free-1500-1650": { scy: 1650, meters: 1500 },
};

export function eventDistance(event: SwimEvent, course: Course): number {
  if (event in LONG_FREE_DISTANCE) {
    const pair = LONG_FREE_DISTANCE[event as keyof typeof LONG_FREE_DISTANCE];
    return course === "SCY" ? pair.scy : pair.meters;
  }
  const [, distance] = event.split("-");
  return Number(distance);
}

const STROKE_LABEL: Record<Stroke, string> = {
  free: "Free",
  back: "Back",
  breast: "Breast",
  fly: "Fly",
  im: "IM",
  kick: "Kick",
  drill: "Drill",
};

export function eventLabel(event: SwimEvent, course: Course): string {
  return `${eventDistance(event, course)} ${STROKE_LABEL[eventStroke(event)]}`;
}
