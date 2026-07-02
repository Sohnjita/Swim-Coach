// Hand-drawn tab icons matching lucide's stroke conventions, for shapes
// lucide doesn't offer as-is (a flask with bubbles, lines with trailing bullets).

interface IconProps {
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/** Erlenmeyer flask (wide angled base, narrow neck) with bubbles rising from the mouth. */
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
      <path d="M9 6h6M9 6v6l-6 9h18l-6-9V6" />
      <circle cx="11" cy="4" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="14.2" cy="2.2" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="12.4" cy="0.6" r="0.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Three lines with a bullet point trailing to the right of each. */
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
      <path d="M4 6h13M4 12h13M4 18h13" />
      <circle cx="20" cy="6" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="20" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="20" cy="18" r="1.15" fill="currentColor" stroke="none" />
    </svg>
  );
}
