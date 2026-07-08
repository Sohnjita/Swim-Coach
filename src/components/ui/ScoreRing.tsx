/**
 * 85+ great (green), 70-84 good (accent blue), 50-69 medium (yellow), 0-49
 * bad (red). Banded on the *rounded* score — the same number the ring
 * displays — so a raw 84.6 (displayed as "85") gets the green band instead
 * of looking stuck on blue.
 */
function ringColor(score: number | null): string {
  if (score === null) return "var(--accent)";
  const rounded = Math.round(score);
  if (rounded >= 85) return "var(--success)";
  if (rounded >= 70) return "var(--accent)";
  if (rounded >= 50) return "var(--warning)";
  return "var(--danger)";
}

export function ScoreRing({
  score,
  size = 64,
  label,
}: {
  score: number | null;
  size?: number;
  label?: string;
}) {
  const stroke = Math.max(4, size * 0.09);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = score === null ? 0 : Math.min(100, Math.max(0, score));
  const offset = circumference * (1 - pct / 100);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--border)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor(score)}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={score === null ? circumference : offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-sm font-semibold text-text-primary">
          {score === null ? "--" : Math.round(score)}
        </span>
        {label && <span className="text-[9px] text-text-tertiary">{label}</span>}
      </div>
    </div>
  );
}
