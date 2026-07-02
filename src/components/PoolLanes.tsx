const LANE_COUNT = 5; // matches BottomNav's tab count

/** Decorative fixed background: vertical lane lines with periodic "buoy" ticks. */
export default function PoolLanes() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 mx-auto flex max-w-md"
    >
      {Array.from({ length: LANE_COUNT }).map((_, i) => (
        <div key={i} className="flex flex-1 justify-center">
          <div className="lane-buoys" />
        </div>
      ))}
    </div>
  );
}
