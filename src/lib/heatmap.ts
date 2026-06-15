import { asc, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { leaderboardSnapshots, matches, predictions, users } from "@/db/schema";
import type { MatchRow } from "@/lib/queries";

/** How many upcoming matches the heatmap surfaces at once. */
const HEATMAP_LIMIT = 8;

export interface MatchSentiment {
  match: MatchRow;
  total: number;
  homeWin: number;
  draw: number;
  awayWin: number;
  /** The viewer's own prediction, if they made one. */
  viewerPick: { homeScore: number; awayScore: number } | null;
  /** The MQ-Chat AI contestant's prediction, if it made one. */
  aiPick: { homeScore: number; awayScore: number } | null;
}

/**
 * Community sentiment for the next {@link HEATMAP_LIMIT} upcoming matches that
 * have at least one prediction, soonest kickoff first. Picks are public from the
 * first submission, so both open and locked matches appear.
 */
export async function getHeatmap(viewerUserId: number): Promise<MatchSentiment[]> {
  const allMatches = await db
    .select()
    .from(matches)
    .orderBy(asc(matches.kickoffUtc), asc(matches.id));
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

  const aiUser = await db.query.users.findFirst({ where: eq(users.isAi, true) });
  const aiPicks = aiUser
    ? await db.select().from(predictions).where(eq(predictions.userId, aiUser.id))
    : [];
  const aiByMatch = new Map(aiPicks.map((p) => [p.matchId, p]));

  const now = Date.now();
  return allMatches
    .map((match) => {
      const s = byMatch.get(match.id);
      const pick = pickByMatch.get(match.id);
      const aiPick = aiByMatch.get(match.id);
      return {
        match,
        total: s?.total ?? 0,
        homeWin: s?.homeWin ?? 0,
        draw: s?.draw ?? 0,
        awayWin: s?.awayWin ?? 0,
        viewerPick: pick ? { homeScore: pick.homeScore, awayScore: pick.awayScore } : null,
        aiPick: aiPick ? { homeScore: aiPick.homeScore, awayScore: aiPick.awayScore } : null,
      };
    })
    .filter((s) => s.total > 0 && s.match.kickoffUtc.getTime() >= now)
    .slice(0, HEATMAP_LIMIT);
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
