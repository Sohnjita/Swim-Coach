import { TABS } from "@/lib/tabs";

const LANE_COUNT = TABS.length;

/**
 * Decorative fixed background: dividing lines between lanes (not one per
 * tab) — tab icons sit in the center of each lane, between the lines, the
 * way a swimmer sits between two lane ropes rather than on top of one.
 */
export default function PoolLanes() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 mx-auto max-w-md">
      {Array.from({ length: LANE_COUNT - 1 }).map((_, i) => (
        <div
          key={i}
          className="lane-buoys absolute top-0 h-full -translate-x-1/2"
          style={{ left: `${((i + 1) / LANE_COUNT) * 100}%` }}
        />
      ))}
    </div>
  );
}
