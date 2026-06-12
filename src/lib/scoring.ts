import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  achievements,
  leaderboardSnapshots,
  matches,
  predictions,
  snapshotEntries,
  users,
} from "@/db/schema";
import type { Stage } from "@/lib/providers/types";

export interface Scoreline {
  homeScore: number;
  awayScore: number;
}

/**
 * The heart of the competition — awards points for one prediction against
 * the 90-minute result:
 *
 *   10 — exact result: correct outcome AND correct scoreline
 *    5 — correct outcome (home win / draw / away win) but wrong scoreline
 *    0 — incorrect outcome
 *
 * Examples from the competition rules:
 *   actual France 2-0 Japan, predicted 2-0 → 10
 *   actual France 2-0 Japan, predicted 4-3 → 5  (home win, wrong score)
 *   actual Canada 3-3 Turkey, predicted 1-1 → 5  (draw, wrong score)
 *   actual France 2-0 Japan, predicted 0-1 → 0
 */
export function computePoints(prediction: Scoreline, result: Scoreline): 0 | 5 | 10 {
  // TODO(fabricio): implement — see examples above and tests in
  // src/lib/__tests__/scoring.test.ts (npm test to check your work).
  throw new Error("computePoints is not implemented yet");
}

/**
 * Awards points for every unscored prediction whose match has finished with a
 * 90-minute result. Idempotent: already-scored predictions are never touched,
 * so it is safe to call on every sync.
 */
export async function scoreFinishedMatches(): Promise<number> {
  const finished = await db
    .select({
      id: matches.id,
      homeScore90: matches.homeScore90,
      awayScore90: matches.awayScore90,
    })
    .from(matches)
    .where(and(eq(matches.status, "FINISHED"), sql`${matches.homeScore90} is not null`));

  if (finished.length === 0) return 0;
  const resultByMatch = new Map(finished.map((m) => [m.id, m]));

  const unscored = await db
    .select()
    .from(predictions)
    .where(
      and(
        isNull(predictions.points),
        inArray(
          predictions.matchId,
          finished.map((m) => m.id),
        ),
      ),
    );

  for (const p of unscored) {
    const result = resultByMatch.get(p.matchId)!;
    const points = computePoints(
      { homeScore: p.homeScore, awayScore: p.awayScore },
      { homeScore: result.homeScore90!, awayScore: result.awayScore90! },
    );
    await db
      .update(predictions)
      .set({ points, scoredAt: new Date() })
      .where(eq(predictions.id, p.id));
  }
  return unscored.length;
}

export interface Standing {
  userId: number;
  rank: number;
  points: number;
}

/** Total points per user (everyone appears, including the AI, even on 0). */
export async function computeStandings(): Promise<Standing[]> {
  const rows = await db
    .select({
      userId: users.id,
      displayName: users.displayName,
      points: sql<number>`coalesce(sum(${predictions.points}), 0)::int`,
    })
    .from(users)
    .leftJoin(predictions, eq(predictions.userId, users.id))
    .groupBy(users.id)
    .orderBy(sql`coalesce(sum(${predictions.points}), 0) desc`, asc(users.displayName));

  // Competition ranking: equal points share a rank (1, 2, 2, 4...).
  let rank = 0;
  let prevPoints = Number.NaN;
  return rows.map((row, i) => {
    if (row.points !== prevPoints) {
      rank = i + 1;
      prevPoints = row.points;
    }
    return { userId: row.userId, rank, points: row.points };
  });
}

export async function takeLeaderboardSnapshot(reason: string): Promise<void> {
  const standings = await computeStandings();
  const [snapshot] = await db
    .insert(leaderboardSnapshots)
    .values({ reason })
    .returning({ id: leaderboardSnapshots.id });
  if (standings.length > 0) {
    await db.insert(snapshotEntries).values(
      standings.map((s) => ({
        snapshotId: snapshot.id,
        userId: s.userId,
        rank: s.rank,
        points: s.points,
      })),
    );
  }
}

/**
 * AI Slayer: for every stage whose matches have all finished with results,
 * award the badge to each participant who out-scored the AI in that stage.
 * The unique index on (user, type, stage) makes re-runs no-ops.
 */
export async function awardAiSlayerForCompletedStages(): Promise<number> {
  const ai = await db.query.users.findFirst({ where: eq(users.isAi, true) });
  if (!ai) return 0;

  const allMatches = await db.select().from(matches);
  const byStage = new Map<Stage, typeof allMatches>();
  for (const m of allMatches) {
    byStage.set(m.stage, [...(byStage.get(m.stage) ?? []), m]);
  }

  let awarded = 0;
  for (const [stage, stageMatches] of byStage) {
    const complete = stageMatches.every(
      (m) => m.status === "FINISHED" && m.homeScore90 !== null,
    );
    if (!complete) continue;

    const stagePoints = await db
      .select({
        userId: predictions.userId,
        points: sql<number>`coalesce(sum(${predictions.points}), 0)::int`,
      })
      .from(predictions)
      .where(
        inArray(
          predictions.matchId,
          stageMatches.map((m) => m.id),
        ),
      )
      .groupBy(predictions.userId);

    const aiPoints = stagePoints.find((s) => s.userId === ai.id)?.points ?? 0;
    const slayers = stagePoints.filter(
      (s) => s.userId !== ai.id && s.points > aiPoints,
    );
    if (slayers.length === 0) continue;

    const inserted = await db
      .insert(achievements)
      .values(slayers.map((s) => ({ userId: s.userId, type: "ai_slayer" as const, stage })))
      .onConflictDoNothing()
      .returning({ id: achievements.id });
    awarded += inserted.length;
  }
  return awarded;
}
