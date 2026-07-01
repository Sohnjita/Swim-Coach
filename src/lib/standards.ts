import type { QualifyingStandard } from "./types";

/**
 * No standards ship pre-loaded. As of this build, USA Swimming had not yet
 * published official 2028 Olympic Trials entry times (they're historically
 * announced roughly a year to 18 months out), and scraping/guessing numbers
 * here would risk showing you a fabricated cut. Add standards yourself on the
 * Times page as USA Swimming/your LSC publishes them — Trials cuts, Futures,
 * Sectionals, or your own club's motivational times all work the same way.
 */
export const DEFAULT_STANDARDS: QualifyingStandard[] = [];

export function gapToCut(
  swimmerTimeSeconds: number,
  standard: QualifyingStandard,
): { deltaSeconds: number; percent: number; underCut: boolean } {
  const delta = swimmerTimeSeconds - standard.timeSeconds;
  return {
    deltaSeconds: delta,
    percent: (delta / standard.timeSeconds) * 100,
    underCut: delta <= 0,
  };
}
