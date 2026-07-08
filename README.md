# Swim Coach

A personal swim training app for tracking practices, planning your schedule, and
projecting race-ready times toward the 2028 U.S. Olympic Trials (50/100 breast).

Built as an installable, iOS-friendly PWA. All data is stored locally on-device
(IndexedDB via Dexie) — there's no server or account.

## Features

- **Practice logging** — fast rep-by-rep entry (time, stroke count, rest
  interval, suit, start type, pool course, RPE) organized into aerobic /
  threshold / sprint / lactate sets.
- **Practice scoring** — every rep and practice gets a transparent 0–100 score
  from pace-vs-personal-best, stroke-count efficiency, and effort-adjusted
  RPE. Weights are tunable in Settings.
- **Set library** — save reusable sets and get a data-driven interval/pace
  suggestion based on your recent trend at that same rep shape.
- **Calendar** — plan swims, lifts, meals, sleep, and meets.
- **Times** — log meet results, add qualifying standards as they're announced,
  and see a taper-adjusted goal-time projection with gap-to-cut.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). For the full iOS feel,
add it to your home screen from Safari (Share → Add to Home Screen).

```bash
npm run build   # production build
npm run lint    # eslint
```

## Notes on the numbers

The scoring formula, course-conversion percentages, taper drop, and suit/start
adjustments in `src/lib/scoring.ts` and `src/lib/conversions.ts` are documented
heuristics, not a validated sports-science model — tune them in Settings as you
learn what correlates with your own racing. Qualifying standards ship empty;
add them yourself as USA Swimming publishes 2028 Trials cuts.
