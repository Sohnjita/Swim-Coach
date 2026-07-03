// Hand-drawn tab icons matching lucide's stroke conventions, for shapes
// lucide doesn't offer as-is (a flask with bubbles, lines with trailing bullets).

interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/** Erlenmeyer flask (wide angled base, narrow neck) with a liquid line and bubbles rising from the mouth. */
export function FlaskBubblesIcon({ size = 24, strokeWidth = 2, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 4h6M9 4v6l-6 10h18l-6-10V4" />
      <path d="M5.6 16.5h12.8" />
      <circle cx="11" cy="2.7" r="0.55" fill="currentColor" stroke="none" />
      <circle cx="13.4" cy="1.7" r="0.4" fill="currentColor" stroke="none" />
      <circle cx="10.2" cy="0.9" r="0.3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Three lines with a bullet point to the left of each. */
export function LinesBulletsIcon({ size = 24, strokeWidth = 2, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}
