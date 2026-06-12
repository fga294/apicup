import { and, asc, eq, gt, isNotNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { achievements, matches, predictions, users } from "@/db/schema";
import { isOpenForPredictions } from "@/lib/competition";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard";

export interface SideStats {
  points: number;
  scored: number;
  /** Share of scored predictions that earned points (outcome or exact), 0..1. */
  hitRate: number | null;
  /** Share of scored predictions that were exact, 0..1. */
  exactRate: number | null;
}

export interface TournamentStats {
  totalParticipants: number;
  totalPredictions: number;
  scoredPredictions: number;
  exactPredictions: number;
  ai: SideStats;
  humans: SideStats;
  bestHumanPoints: number;
  aiSlayerBadges: number;
  /** Most predicted scoreline, e.g. "2–1" (null before any predictions). */
  popularScoreline: string | null;
  finishedMatches: number;
  totalMatches: number;
}

export interface UpcomingMatch {
  id: number;
  stage: string;
  homeTeam: string | null;
  awayTeam: string | null;
  homeCrestUrl: string | null;
  awayCrestUrl: string | null;
  kickoffUtc: string;
  predictionsCount: number;
  open: boolean;
}

export interface RecentResult {
  homeTeam: string;
  awayTeam: string;
  homeScore90: number;
  awayScore90: number;
}

export interface TvData {
  generatedAt: string;
  leaderboard: LeaderboardEntry[];
  upcoming: UpcomingMatch[];
  recentResults: RecentResult[];
  stats: TournamentStats;
}

async function getStats(leaderboard: LeaderboardEntry[]): Promise<TournamentStats> {
  const [predTotals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      scored: sql<number>`count(${predictions.points})::int`,
      exact: sql<number>`count(*) filter (where ${predictions.points} = 10)::int`,
    })
    .from(predictions);

  const sideRows = await db
    .select({
      isAi: users.isAi,
      points: sql<number>`coalesce(sum(${predictions.points}), 0)::int`,
      scored: sql<number>`count(${predictions.points})::int`,
      hits: sql<number>`count(*) filter (where ${predictions.points} >= 5)::int`,
      exact: sql<number>`count(*) filter (where ${predictions.points} = 10)::int`,
    })
    .from(predictions)
    .innerJoin(users, eq(users.id, predictions.userId))
    .groupBy(users.isAi);

  const side = (isAi: boolean): SideStats => {
    const row = sideRows.find((r) => r.isAi === isAi);
    if (!row) return { points: 0, scored: 0, hitRate: null, exactRate: null };
    return {
      points: row.points,
      scored: row.scored,
      hitRate: row.scored ? row.hits / row.scored : null,
      exactRate: row.scored ? row.exact / row.scored : null,
    };
  };

  const [scorelineRow] = await db
    .select({
      home: predictions.homeScore,
      away: predictions.awayScore,
      n: sql<number>`count(*)::int`,
    })
    .from(predictions)
    .groupBy(predictions.homeScore, predictions.awayScore)
    .orderBy(sql`count(*) desc`)
    .limit(1);

  const [slayerRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(achievements)
    .where(eq(achievements.type, "ai_slayer"));

  const [matchTotals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      finished: sql<number>`count(*) filter (where ${matches.status} = 'FINISHED')::int`,
    })
    .from(matches);

  const humans = leaderboard.filter((e) => !e.isAi);
  return {
    totalParticipants: leaderboard.length,
    totalPredictions: predTotals.total,
    scoredPredictions: predTotals.scored,
    exactPredictions: predTotals.exact,
    ai: side(true),
    humans: side(false),
    bestHumanPoints: humans.length > 0 ? Math.max(...humans.map((e) => e.points)) : 0,
    aiSlayerBadges: slayerRow.n,
    popularScoreline: scorelineRow ? `${scorelineRow.home}–${scorelineRow.away}` : null,
    finishedMatches: matchTotals.finished,
    totalMatches: matchTotals.total,
  };
}

export async function getTvData(): Promise<TvData> {
  const leaderboard = await getLeaderboard();

  const upcomingRows = await db
    .select()
    .from(matches)
    .where(gt(matches.kickoffUtc, new Date()))
    .orderBy(asc(matches.kickoffUtc))
    .limit(8);

  const counts = await db
    .select({ matchId: predictions.matchId, n: sql<number>`count(*)::int` })
    .from(predictions)
    .groupBy(predictions.matchId);
  const countByMatch = new Map(counts.map((c) => [c.matchId, c.n]));

  const recentRows = await db
    .select()
    .from(matches)
    .where(and(eq(matches.status, "FINISHED"), isNotNull(matches.homeScore90)))
    .orderBy(sql`${matches.kickoffUtc} desc`)
    .limit(6);

  return {
    generatedAt: new Date().toISOString(),
    leaderboard,
    upcoming: upcomingRows.map((m) => ({
      id: m.id,
      stage: m.stage,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeCrestUrl: m.homeCrestUrl,
      awayCrestUrl: m.awayCrestUrl,
      kickoffUtc: m.kickoffUtc.toISOString(),
      predictionsCount: countByMatch.get(m.id) ?? 0,
      open: isOpenForPredictions(m),
    })),
    recentResults: recentRows.map((m) => ({
      homeTeam: m.homeTeam ?? "TBD",
      awayTeam: m.awayTeam ?? "TBD",
      homeScore90: m.homeScore90!,
      awayScore90: m.awayScore90!,
    })),
    stats: await getStats(leaderboard),
  };
}
