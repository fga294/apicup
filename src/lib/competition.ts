// Domain rules for The API Cup that must have exactly one source of truth.

/** Predictions close exactly one hour before kickoff. */
export const PREDICTION_LOCK_MS = 60 * 60 * 1000;

export function predictionCutoff(kickoffUtc: Date): Date {
  return new Date(kickoffUtc.getTime() - PREDICTION_LOCK_MS);
}

export interface PredictableMatch {
  kickoffUtc: Date;
  homeTeam: string | null;
  awayTeam: string | null;
  status: string;
}

/**
 * A match accepts predictions only when both teams are determined, it has not
 * been cancelled/postponed, and the cutoff has not passed. The server clock is
 * authoritative — callers must never trust a client-supplied time.
 */
export function isOpenForPredictions(
  match: PredictableMatch,
  now: Date = new Date(),
): boolean {
  if (!match.homeTeam || !match.awayTeam) return false;
  if (!["SCHEDULED", "TIMED"].includes(match.status)) return false;
  return now < predictionCutoff(match.kickoffUtc);
}
