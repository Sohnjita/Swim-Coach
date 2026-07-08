"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_PROFILE, PROFILE_ID } from "@/lib/db";
import { Card, CardTitle } from "@/components/ui/Card";
import {
  TRAINING_SET_TYPE_LABEL,
  TRAINING_SET_TYPES,
  trainingZoneLevels,
} from "@/lib/trainingPowerIndex";

const SIZE = 220;
const CENTER = SIZE / 2;
const MAX_RADIUS = 78;
const NO_DATA_RADIUS = MAX_RADIUS * 0.25;

function pointFor(index: number, radius: number) {
  const angle = (index / TRAINING_SET_TYPES.length) * Math.PI * 2 - Math.PI / 2;
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
 * A 4-pointed reach chart — one axis per training zone (aerobic/threshold/
 * sprint/lactate) — showing how close the swimmer's practice pace in that
 * zone is to what the current 50/100/200 breaststroke world records imply
 * is required there. Each event weighs in on every zone by a different
 * amount (the 50 barely touches "aerobic", the 200 barely touches "sprint"),
 * so a single fast sprint rep won't move the aerobic vertex much.
 */
export function TrainingPowerIndex() {
  const practices = useLiveQuery(() => db.practices.toArray(), []) ?? [];
  const profile = useLiveQuery(() => db.profile.get(PROFILE_ID), []) ?? DEFAULT_PROFILE;

  const zones = trainingZoneLevels(practices, profile.gender);
  const hasData = zones.some((z) => z.level !== null);
  const radii = zones.map((z) =>
    z.level === null ? NO_DATA_RADIUS : (MAX_RADIUS * Math.max(0, Math.min(100, z.level))) / 100,
  );

  const outerPoints = TRAINING_SET_TYPES.map((_, i) => pointFor(i, MAX_RADIUS));
  const midPoints = TRAINING_SET_TYPES.map((_, i) => pointFor(i, MAX_RADIUS * 0.5));

  return (
    <Card>
      <CardTitle className="mb-1">Training power index</CardTitle>
      <p className="mb-3 text-xs text-text-tertiary">
        Breaststroke practice pace vs. 50/100/200 world-record pace, by set type
      </p>
      <div className="flex flex-col items-center">
        <svg width={SIZE} height={SIZE} className="overflow-visible">
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
            fill="var(--accent)"
            fillOpacity={0.35}
            stroke="var(--accent)"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {TRAINING_SET_TYPES.map((setType, i) => {
            const label = pointFor(i, MAX_RADIUS + 20);
            return (
              <text
                key={setType}
                x={label.x}
                y={label.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--text-tertiary)"
                fontSize={11}
              >
                {TRAINING_SET_TYPE_LABEL[setType]}
              </text>
            );
          })}
        </svg>
        {!hasData && (
          <p className="mt-1 text-center text-xs text-text-tertiary">
            Log breaststroke reps at 50/100/200 in aerobic, threshold, sprint, or
            lactate blocks to see this fill in.
          </p>
        )}
      </div>
    </Card>
  );
}
