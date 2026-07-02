// Pure points-reconciliation logic — no database, no IO, so it can be unit
// tested in isolation (like points.ts and standings.ts). scoreFinishedMatches()
// (src/lib/scoring.ts) fetches finished results + their predictions, then defers
// here to decide which points are stale and what they should become.

import { computePoints } from "@/lib/points";

/** A finished match's 90-minute result — the only result the competition scores. */
export interface FinishedResult {
  homeScore90: number;
  awayScore90: number;
}

export interface ScorablePrediction {
  id: number;
  matchId: number;
  homeScore: number;
  awayScore: number;
  /** Currently stored points, or null if never scored. */
  points: number | null;
}

export interface PointCorrection {
  id: number;
  points: 0 | 5 | 10;
}

/**
 * Reconcile stored prediction points against the current 90' results, returning
 * only the predictions whose stored value is wrong. This covers both first-time
 * scoring (null → value) AND correction of a previously-wrong score — the latter
 * is what makes the fix self-healing: if a match result is ever corrected (a
 * provider backfill after extra time, or an admin override), the affected points
 * follow it instead of being frozen at their first, possibly-wrong value.
 *
 * Predictions on matches with no finished 90' result are left untouched.
 */
export function reconcilePoints(
  results: Map<number, FinishedResult>,
  predictions: ScorablePrediction[],
): PointCorrection[] {
  const corrections: PointCorrection[] = [];
  for (const p of predictions) {
    const result = results.get(p.matchId);
    if (!result) continue;
    const correct = computePoints(
      { homeScore: p.homeScore, awayScore: p.awayScore },
      { homeScore: result.homeScore90, awayScore: result.awayScore90 },
    );
    if (correct !== p.points) corrections.push({ id: p.id, points: correct });
  }
  return corrections;
}
