// Pure ranking logic for the leaderboard — deliberately free of any database
// access so it can be unit-tested in isolation. computeStandings()
// (src/lib/scoring.ts) fetches each player's point and exact-score totals, then
// defers to rankStandings() to order and number them.

export interface StandingInput {
  userId: number;
  displayName: string;
  points: number;
  /** Number of exact-scoreline predictions (10-pointers). */
  exactCount: number;
}

export interface Standing {
  userId: number;
  rank: number;
  points: number;
}

/**
 * Order players by points, breaking ties on exact-score count — the hardest,
 * highest-skill result, so the order is intuitive and explainable. Display name
 * is the final, purely cosmetic fallback.
 *
 * Ranks are distinct: two players share a rank only when they match on BOTH
 * points and exact count; otherwise the higher exact count earns the better
 * rank (1, 2, 3, 4…), with the usual competition skip after a shared rank.
 */
export function rankStandings(rows: StandingInput[]): Standing[] {
  const sorted = [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.exactCount - a.exactCount ||
      a.displayName.localeCompare(b.displayName),
  );

  let rank = 0;
  let prevPoints = Number.NaN;
  let prevExact = Number.NaN;
  return sorted.map((r, i) => {
    if (r.points !== prevPoints || r.exactCount !== prevExact) {
      rank = i + 1;
      prevPoints = r.points;
      prevExact = r.exactCount;
    }
    return { userId: r.userId, rank, points: r.points };
  });
}
