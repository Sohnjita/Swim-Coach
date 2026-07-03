"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_PROFILE, PROFILE_ID } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import { STROKE_CATEGORIES, STROKE_CATEGORY_LABEL } from "@/lib/events";
import { categoryReach, sprintDistanceLean } from "@/lib/timesData";

const SIZE = 220;
const CENTER = SIZE / 2;
const MAX_RADIUS = 78;
const NO_DATA_RADIUS = MAX_RADIUS * 0.25;

function pointFor(index: number, radius: number) {
  const angle = (index / STROKE_CATEGORIES.length) * Math.PI * 2 - Math.PI / 2;
  return { x: CENTER + radius * Math.cos(angle), y: CENTER + radius * Math.sin(angle) };
}

function pathFor(radii: number[]) {
  return (
    radii
      .map((r, i) => {
        const { x, y } = pointFor(i, r);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ") + " Z"
  );
}

/**
 * A 5-pointed reach chart — one axis per stroke category (Free/Back/Breast/
 * Fly/IM) — showing how close the swimmer's best meet times are to the
 * toughest Standards cut they've beaten in that category. Fill color leans
 * from --accent (distance-heavy standing) to --warning (sprint-heavy
 * standing) based on which events are actually carrying the shape.
 */
export function PowerIndex() {
  const results = useLiveQuery(() => db.meetResults.toArray(), []) ?? [];
  const standards = useLiveQuery(() => db.standards.toArray(), []) ?? [];
  const profile = useLiveQuery(() => db.profile.get(PROFILE_ID), []) ?? DEFAULT_PROFILE;

  const reaches = STROKE_CATEGORIES.map((category) =>
    categoryReach(standards, results, category, profile.gender),
  );
  const hasData = reaches.some((r) => r !== null);
  const radii = reaches.map((r) => (r === null ? NO_DATA_RADIUS : (MAX_RADIUS * Math.max(0, Math.min(100, r))) / 100));

  const lean = sprintDistanceLean(standards, results, profile.gender);
  const sprintPct = Math.round(((lean + 1) / 2) * 100);
  const stopA = `color-mix(in srgb, var(--warning) ${Math.min(100, sprintPct + 15)}%, var(--accent))`;
  const stopB = `color-mix(in srgb, var(--warning) ${Math.max(0, sprintPct - 15)}%, var(--accent))`;

  const outerPoints = STROKE_CATEGORIES.map((_, i) => pointFor(i, MAX_RADIUS));
  const midPoints = STROKE_CATEGORIES.map((_, i) => pointFor(i, MAX_RADIUS * 0.5));

  return (
    <Card>
      <CardTitle className="mb-3">Power index</CardTitle>
      <div className="flex flex-col items-center">
        <svg width={SIZE} height={SIZE} className="overflow-visible">
          <defs>
            <linearGradient id="power-index-fill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={stopA} />
              <stop offset="100%" stopColor={stopB} />
            </linearGradient>
          </defs>

          <polygon
            points={outerPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="var(--border)"
            strokeWidth={1}
          />
          <polygon
            points={midPoints.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="var(--border)"
            strokeWidth={1}
          />

          <path
            d={pathFor(radii)}
            fill="url(#power-index-fill)"
            fillOpacity={0.5}
            stroke="url(#power-index-fill)"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {STROKE_CATEGORIES.map((category, i) => {
            const label = pointFor(i, MAX_RADIUS + 18);
            return (
              <text
                key={category}
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--text-tertiary)"
                fontSize={11}
              >
                {STROKE_CATEGORY_LABEL[category]}
              </text>
            );
          })}
        </svg>
        {!hasData && (
          <p className="mt-1 text-center text-xs text-text-tertiary">
            Log a meet result and a standard to see this fill in.
          </p>
        )}
      </div>
    </Card>
  );
}
