// Hand-drawn tab icons matching lucide's stroke conventions, for shapes
// lucide doesn't offer as-is (a flask with bubbles, lines with trailing bullets).

interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/** Erlenmeyer flask (rounded base, wide neck) with a filled liquid line and bubbles rising from the mouth. */
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
      <path
        d="M4.82 16 3 20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2l-1.82-4z"
        fill="currentColor"
        fillOpacity="0.3"
        stroke="none"
      />
      <path d="M8 4h8M8 4v5l-5 11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2l-5-11V4" />
      <path d="M4.82 16h14.36" />
      <circle cx="9.6" cy="2.1" r="0.55" fill="currentColor" stroke="none" />
      <circle cx="13.8" cy="2.6" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="0.9" r="0.4" fill="currentColor" stroke="none" />
      <circle cx="11.2" cy="3.4" r="0.3" fill="currentColor" stroke="none" />
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
