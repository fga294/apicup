import { and, eq, inArray, sql } from "drizzle-orm";

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
import { reconcilePoints } from "@/lib/rescore";
import { rankStandings, type Standing } from "@/lib/standings";

export { computePoints, type Scoreline } from "@/lib/points";
export type { Standing };

/**
 * Reconciles points for every prediction on a finished match against its
 * current 90-minute result, writing only those whose stored value is wrong.
 * Idempotent (a settled match with correct points yields zero writes) and
 * self-healing: if a result is later corrected — the provider backfilling the
 * 90' score after extra time, or an admin override — the affected points follow
 * it instead of staying frozen at their first, possibly-wrong value. Returns the
 * number of predictions whose points changed.
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
  const results = new Map(
    finished.map((m) => [m.id, { homeScore90: m.homeScore90!, awayScore90: m.awayScore90! }]),
  );

  const rows = await db
    .select({
      id: predictions.id,
      matchId: predictions.matchId,
      homeScore: predictions.homeScore,
      awayScore: predictions.awayScore,
      points: predictions.points,
    })
    .from(predictions)
    .where(inArray(predictions.matchId, [...results.keys()]));

  const corrections = reconcilePoints(results, rows);
  const scoredAt = new Date();
  for (const c of corrections) {
    await db
      .update(predictions)
      .set({ points: c.points, scoredAt })
      .where(eq(predictions.id, c.id));
  }
  return corrections.length;
}

/** Total points per user (everyone appears, including the AI, even on 0). */
export async function computeStandings(): Promise<Standing[]> {
  const rows = await db
    .select({
      userId: users.id,
      displayName: users.displayName,
      points: sql<number>`coalesce(sum(${predictions.points}), 0)::int`,
      exactCount: sql<number>`count(*) filter (where ${predictions.points} = 10)::int`,
    })
    .from(users)
    .leftJoin(predictions, eq(predictions.userId, users.id))
    .groupBy(users.id);

  // Ordering + ranking (points, then exact-score count as the tie-break) lives
  // in the pure, unit-tested rankStandings() so the rule has one clear home.
  return rankStandings(rows);
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
