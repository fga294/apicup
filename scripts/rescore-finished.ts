/**
 * Reconcile stored prediction points against the CURRENT 90-minute result of
 * every finished match, and report/repair any that are stale.
 *
 * Why this exists: historically scoreFinishedMatches() only ever scored
 * predictions whose points were still NULL, so once a match was scored its
 * points were frozen — even if the match's result was later corrected. When a
 * knockout game went to extra time, football-data.org briefly reported the
 * finished match with `duration:"REGULAR"` and its post-extra-time `fullTime`
 * score before backfilling the true 90' figure into `regularTime`, so the match
 * could be scored against the wrong result and stay that way. Belgium v Senegal
 * (90' = 2-2 draw, final 3-2 after extra time) was scored as a Belgium win: draw
 * predictors got 0, Belgium-win predictors got points.
 *
 * scoreFinishedMatches() is now self-healing (it reconciles instead of only
 * filling NULLs), so going forward any corrected result flows through to points
 * on the next sync. This script is the one-off to repair the points that were
 * already frozen before that fix shipped, with a preview-first, opt-in write.
 *
 * It touches ONLY prediction points (and scoredAt) for predictions whose stored
 * value disagrees with the match's stored 90' result. It never changes a match
 * row, a result, a lock, a user, or anything else. A match whose points are
 * already correct yields zero writes.
 *
 * DRY RUN BY DEFAULT: with no flag it only reads — it prints exactly which
 * predictions would change (old -> new), the per-user net delta, and the
 * before/after leaderboard — then exits without writing. Pass --yes to apply
 * the corrections through the normal settle path (which also snapshots the
 * leaderboard, so movement arrows reflect the correction).
 *
 * Local (dry run):  npm run db:rescore-finished
 * Local (execute):  npm run db:rescore-finished -- --yes
 * Production:        vercel env pull --environment=production .env.prod
 *                    tsx --env-file=.env.prod scripts/rescore-finished.ts        # dry run
 *                    tsx --env-file=.env.prod scripts/rescore-finished.ts --yes  # execute
 *                    rm .env.prod
 */
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "../src/db";
import { matches, predictions, users } from "../src/db/schema";
import { reconcilePoints, type ScorablePrediction } from "../src/lib/rescore";
import { rankStandings, type StandingInput } from "../src/lib/standings";
import { settleResults } from "../src/lib/sync";

function dbHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").host || "(unknown)";
  } catch {
    return "(unparseable DATABASE_URL)";
  }
}

async function main() {
  const execute = process.argv.includes("--yes");
  console.log(`Target DB host: ${dbHost()}`);
  console.log(execute ? "MODE: EXECUTE (--yes)\n" : "MODE: DRY RUN (no --yes)\n");

  // 1. Finished matches with a 90' result — exactly what scoreFinishedMatches scans.
  const finished = await db
    .select({
      id: matches.id,
      providerMatchId: matches.providerMatchId,
      homeTeam: matches.homeTeam,
      awayTeam: matches.awayTeam,
      homeScore90: matches.homeScore90,
      awayScore90: matches.awayScore90,
    })
    .from(matches)
    .where(and(eq(matches.status, "FINISHED"), sql`${matches.homeScore90} is not null`));

  const results = new Map(
    finished.map((m) => [m.id, { homeScore90: m.homeScore90!, awayScore90: m.awayScore90! }]),
  );
  const matchById = new Map(finished.map((m) => [m.id, m]));
  console.log(`Finished matches scanned: ${finished.length}`);
  if (finished.length === 0) {
    console.log("Nothing to reconcile.");
    process.exit(0);
  }

  // 2. All predictions on those matches, with the predictor's name.
  const rows = await db
    .select({
      id: predictions.id,
      matchId: predictions.matchId,
      userId: predictions.userId,
      displayName: users.displayName,
      homeScore: predictions.homeScore,
      awayScore: predictions.awayScore,
      points: predictions.points,
    })
    .from(predictions)
    .innerJoin(users, eq(users.id, predictions.userId))
    .where(inArray(predictions.matchId, [...results.keys()]));

  const scorable: ScorablePrediction[] = rows.map((r) => ({
    id: r.id,
    matchId: r.matchId,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    points: r.points,
  }));
  const corrections = reconcilePoints(results, scorable);

  if (corrections.length === 0) {
    console.log("\nAll finished-match points already match their 90' result. No changes.");
    process.exit(0);
  }

  // 3. Show every change, grouped by match.
  const rowById = new Map(rows.map((r) => [r.id, r]));
  const newById = new Map(corrections.map((c) => [c.id, c.points]));
  const byMatch = new Map<number, typeof corrections>();
  for (const c of corrections) {
    const mid = rowById.get(c.id)!.matchId;
    byMatch.set(mid, [...(byMatch.get(mid) ?? []), c]);
  }

  console.log(`\nPredictions needing correction: ${corrections.length}\n`);
  for (const [mid, cs] of byMatch) {
    const m = matchById.get(mid)!;
    console.log(`── MATCH ${m.providerMatchId}  ${m.homeTeam} vs ${m.awayTeam}  (90' = ${m.homeScore90}-${m.awayScore90})`);
    for (const c of cs) {
      const r = rowById.get(c.id)!;
      console.log(`     ${r.displayName.padEnd(22)} predicted ${r.homeScore}-${r.awayScore}:  ${r.points ?? "null"} -> ${c.points} pts`);
    }
  }

  // 4. Per-user net delta.
  const deltaByUser = new Map<number, { name: string; delta: number }>();
  for (const c of corrections) {
    const r = rowById.get(c.id)!;
    const d = c.points - (r.points ?? 0);
    const cur = deltaByUser.get(r.userId) ?? { name: r.displayName, delta: 0 };
    cur.delta += d;
    deltaByUser.set(r.userId, cur);
  }
  console.log("\nPer-user net change:");
  for (const [, { name, delta }] of [...deltaByUser].sort((a, b) => b[1].delta - a[1].delta)) {
    console.log(`     ${delta >= 0 ? "+" : ""}${delta} pts   ${name}`);
  }

  // 5. Before/after leaderboard (top 15) using the real ranking rule.
  const standingRows = await db
    .select({
      userId: users.id,
      displayName: users.displayName,
      points: sql<number>`coalesce(sum(${predictions.points}), 0)::int`,
      exactCount: sql<number>`count(*) filter (where ${predictions.points} = 10)::int`,
    })
    .from(users)
    .leftJoin(predictions, eq(predictions.userId, users.id))
    .groupBy(users.id);

  const afterRows: StandingInput[] = standingRows.map((s) => {
    let points = s.points;
    let exactCount = s.exactCount;
    for (const r of rows.filter((x) => x.userId === s.userId && newById.has(x.id))) {
      const np = newById.get(r.id)!;
      const op = r.points ?? 0;
      points += np - op;
      exactCount += (np === 10 ? 1 : 0) - (op === 10 ? 1 : 0);
    }
    return { userId: s.userId, displayName: s.displayName, points, exactCount };
  });

  const nameById = new Map(standingRows.map((s) => [s.userId, s.displayName]));
  const before = rankStandings(standingRows);
  const after = rankStandings(afterRows);
  const beforeRank = new Map(before.map((s) => [s.userId, s]));
  const afterRank = new Map(after.map((s) => [s.userId, s]));

  console.log("\nLeaderboard (top 15)   BEFORE -> AFTER:");
  for (const s of after.slice(0, 15)) {
    const b = beforeRank.get(s.userId)!;
    const moved = b.rank !== s.rank ? `   (#${b.rank}→#${s.rank})` : "";
    console.log(`     #${String(s.rank).padStart(2)}  ${nameById.get(s.userId)!.padEnd(22)} ${s.points} pts${moved}`);
  }
  // Also surface anyone who fell OUT of the top 15 but was in it before.
  const afterTop = new Set(after.slice(0, 15).map((s) => s.userId));
  const droppedOut = before.slice(0, 15).filter((s) => !afterTop.has(s.userId));
  if (droppedOut.length > 0) {
    console.log("   dropped out of top 15:");
    for (const s of droppedOut) {
      const a = afterRank.get(s.userId)!;
      console.log(`     was #${s.rank} ${nameById.get(s.userId)!} → now #${a.rank} (${a.points} pts)`);
    }
  }

  if (!execute) {
    console.log("\nDRY RUN — nothing was written. Re-run with --yes to apply.");
    process.exit(0);
  }

  // 6. Apply through the normal settle path (reconciles + snapshots the board).
  console.log("\nApplying via settleResults()…");
  const { scoredPredictions, aiSlayersAwarded } = await settleResults("manual extra-time rescore");
  console.log(`Corrected ${scoredPredictions} prediction(s); AI Slayer badges awarded: ${aiSlayersAwarded}.`);

  // 7. Verify nothing remains stale.
  const recheck = reconcilePoints(
    results,
    (
      await db
        .select({
          id: predictions.id,
          matchId: predictions.matchId,
          homeScore: predictions.homeScore,
          awayScore: predictions.awayScore,
          points: predictions.points,
        })
        .from(predictions)
        .where(inArray(predictions.matchId, [...results.keys()]))
    ),
  );
  console.log(recheck.length === 0 ? "Verified: 0 stale predictions remain." : `WARNING: ${recheck.length} still stale!`);
  process.exit(recheck.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
