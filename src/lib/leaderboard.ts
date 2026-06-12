import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  achievements,
  leaderboardSnapshots,
  predictions,
  snapshotEntries,
  users,
} from "@/db/schema";
import { computeStandings } from "@/lib/scoring";

export interface LeaderboardEntry {
  userId: number;
  displayName: string;
  isAi: boolean;
  rank: number;
  points: number;
  /** Positive = climbed, negative = dropped, 0 = no change, null = new entry. */
  movement: number | null;
  predictionsMade: number;
  predictionsScored: number;
  exactCount: number;
  /** Exact predictions / scored predictions, 0..1; null with no scored picks. */
  exactRate: number | null;
  aiSlayerCount: number;
  isGoldenPredictor: boolean;
}

/**
 * The complete leaderboard read-model: live standings joined with user info,
 * per-user accuracy, movement vs. the previous snapshot, and badges.
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const [standings, userRows, statRows, slayerRows, previous] = await Promise.all([
    computeStandings(),
    db.select().from(users),
    db
      .select({
        userId: predictions.userId,
        made: sql<number>`count(*)::int`,
        scored: sql<number>`count(${predictions.points})::int`,
        exact: sql<number>`count(*) filter (where ${predictions.points} = 10)::int`,
      })
      .from(predictions)
      .groupBy(predictions.userId),
    db
      .select({
        userId: achievements.userId,
        count: sql<number>`count(*)::int`,
      })
      .from(achievements)
      .where(eq(achievements.type, "ai_slayer"))
      .groupBy(achievements.userId),
    getPreviousRanks(),
  ]);

  const userById = new Map(userRows.map((u) => [u.id, u]));
  const statsById = new Map(statRows.map((s) => [s.userId, s]));
  const slayersById = new Map(slayerRows.map((s) => [s.userId, s.count]));

  const entries: LeaderboardEntry[] = standings.map((s) => {
    const user = userById.get(s.userId)!;
    const stats = statsById.get(s.userId);
    const prevRank = previous.get(s.userId);
    return {
      userId: s.userId,
      displayName: user.displayName,
      isAi: user.isAi,
      rank: s.rank,
      points: s.points,
      movement: prevRank === undefined ? null : prevRank - s.rank,
      predictionsMade: stats?.made ?? 0,
      predictionsScored: stats?.scored ?? 0,
      exactCount: stats?.exact ?? 0,
      exactRate: stats?.scored ? stats.exact / stats.scored : null,
      aiSlayerCount: slayersById.get(s.userId) ?? 0,
      isGoldenPredictor: false,
    };
  });

  // Golden Predictor: best exact-score rate among users with scored picks.
  // Ties break toward more exact hits, then more total points.
  const candidates = entries
    .filter((e) => e.exactRate !== null && e.exactRate > 0)
    .sort(
      (a, b) =>
        b.exactRate! - a.exactRate! ||
        b.exactCount - a.exactCount ||
        b.points - a.points,
    );
  if (candidates.length > 0) {
    const top = candidates[0];
    for (const e of entries) {
      e.isGoldenPredictor =
        e.exactRate === top.exactRate &&
        e.exactCount === top.exactCount &&
        e.points === top.points;
    }
  }

  return entries;
}

/**
 * Rank per user in the second-latest snapshot. Sync snapshots standings right
 * after scoring, so live standings equal the latest snapshot — movement is
 * only meaningful against the snapshot before that one.
 */
async function getPreviousRanks(): Promise<Map<number, number>> {
  const secondLatest = await db
    .select({ id: leaderboardSnapshots.id })
    .from(leaderboardSnapshots)
    .orderBy(desc(leaderboardSnapshots.takenAt), desc(leaderboardSnapshots.id))
    .limit(1)
    .offset(1);
  if (secondLatest.length === 0) return new Map();

  const entries = await db
    .select({ userId: snapshotEntries.userId, rank: snapshotEntries.rank })
    .from(snapshotEntries)
    .where(eq(snapshotEntries.snapshotId, secondLatest[0].id));
  return new Map(entries.map((e) => [e.userId, e.rank]));
}
