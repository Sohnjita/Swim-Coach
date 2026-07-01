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
          stroke="var(--accent)"
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
