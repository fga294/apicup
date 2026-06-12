import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { leaderboardSnapshots, matches, predictions } from "@/db/schema";
import type { MatchRow } from "@/lib/queries";

export interface MatchSentiment {
  match: MatchRow;
  total: number;
  homeWin: number;
  draw: number;
  awayWin: number;
  /** The viewer's own prediction, if they made one. */
  viewerPick: { homeScore: number; awayScore: number } | null;
}

/**
 * Community sentiment for every match with at least one prediction, open or
 * locked — the crowd's picks are public from the first submission.
 */
export async function getHeatmap(viewerUserId: number): Promise<MatchSentiment[]> {
  const allMatches = await db
    .select()
    .from(matches)
    .orderBy(desc(matches.kickoffUtc));
  if (allMatches.length === 0) return [];

  const sentiments = await db
    .select({
      matchId: predictions.matchId,
      total: sql<number>`count(*)::int`,
      homeWin: sql<number>`count(*) filter (where ${predictions.homeScore} > ${predictions.awayScore})::int`,
      draw: sql<number>`count(*) filter (where ${predictions.homeScore} = ${predictions.awayScore})::int`,
      awayWin: sql<number>`count(*) filter (where ${predictions.homeScore} < ${predictions.awayScore})::int`,
    })
    .from(predictions)
    .groupBy(predictions.matchId);
  const byMatch = new Map(sentiments.map((s) => [s.matchId, s]));

  const viewerPicks = await db
    .select()
    .from(predictions)
    .where(eq(predictions.userId, viewerUserId));
  const pickByMatch = new Map(viewerPicks.map((p) => [p.matchId, p]));

  return allMatches
    .map((match) => {
      const s = byMatch.get(match.id);
      const pick = pickByMatch.get(match.id);
      return {
        match,
        total: s?.total ?? 0,
        homeWin: s?.homeWin ?? 0,
        draw: s?.draw ?? 0,
        awayWin: s?.awayWin ?? 0,
        viewerPick: pick ? { homeScore: pick.homeScore, awayScore: pick.awayScore } : null,
      };
    })
    .filter((s) => s.total > 0);
}

export interface SnapshotInfo {
  id: number;
  takenAt: Date;
  reason: string;
}

export async function getSnapshotHistory(limit = 12): Promise<SnapshotInfo[]> {
  return db
    .select({
      id: leaderboardSnapshots.id,
      takenAt: leaderboardSnapshots.takenAt,
      reason: leaderboardSnapshots.reason,
    })
    .from(leaderboardSnapshots)
    .orderBy(desc(leaderboardSnapshots.takenAt), desc(leaderboardSnapshots.id))
    .limit(limit);
}
