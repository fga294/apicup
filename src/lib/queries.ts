import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { matches, predictions } from "@/db/schema";

export type MatchRow = typeof matches.$inferSelect;
export type PredictionRow = typeof predictions.$inferSelect;

export interface MatchWithPrediction {
  match: MatchRow;
  prediction: PredictionRow | null;
}

/** All matches in kickoff order, each with the viewer's prediction if any. */
export async function getMatchesWithUserPrediction(
  userId: number,
): Promise<MatchWithPrediction[]> {
  const [allMatches, userPredictions] = await Promise.all([
    db.select().from(matches).orderBy(asc(matches.kickoffUtc), asc(matches.id)),
    db.select().from(predictions).where(eq(predictions.userId, userId)),
  ]);
  const byMatch = new Map(userPredictions.map((p) => [p.matchId, p]));
  return allMatches.map((match) => ({
    match,
    prediction: byMatch.get(match.id) ?? null,
  }));
}

export const STAGE_LABELS: Record<MatchRow["stage"], string> = {
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter Finals",
  SEMI_FINALS: "Semi Finals",
  THIRD_PLACE: "Third Place Match",
  FINAL: "Final",
};

export const STAGE_ORDER: MatchRow["stage"][] = [
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
];
