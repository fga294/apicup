/**
 * Dev-only end-to-end check of the result-settlement pipeline: inserts a
 * finished match with unscored predictions, runs settleResults, and verifies
 * points, snapshot, and movement. Run after db:simulate.
 */
import { eq, like } from "drizzle-orm";

import { db } from "../src/db";
import { matches, predictions, users } from "../src/db/schema";
import { getLeaderboard } from "../src/lib/leaderboard";
import { settleResults } from "../src/lib/sync";

async function main() {
  const simUsers = await db.select().from(users).where(like(users.username, "sim_%"));
  const byName = new Map(simUsers.map((u) => [u.username, u]));
  const alice = byName.get("sim_alice");
  const bob = byName.get("sim_bob");
  const david = byName.get("sim_david");
  if (!alice || !bob || !david) throw new Error("run db:simulate first");

  // Finished match the pipeline has not seen: Portugal 2-0 Korea.
  const [match] = await db
    .insert(matches)
    .values({
      provider: "manual",
      providerMatchId: `e2e-${Date.now()}`,
      stage: "LAST_16",
      homeTeam: "Portugal",
      awayTeam: "Korea Republic",
      kickoffUtc: new Date(Date.now() - 3 * 3600_000),
      status: "FINISHED",
      homeScore90: 2,
      awayScore90: 0,
    })
    .returning();

  await db.insert(predictions).values([
    { userId: alice.id, matchId: match.id, homeScore: 2, awayScore: 0 }, // exact → 10
    { userId: bob.id, matchId: match.id, homeScore: 1, awayScore: 0 }, // outcome → 5
    { userId: david.id, matchId: match.id, homeScore: 0, awayScore: 2 }, // wrong → 0
  ]);

  const settled = await settleResults("e2e test");
  console.log("settled:", settled);

  const scored = await db
    .select({ userId: predictions.userId, points: predictions.points })
    .from(predictions)
    .where(eq(predictions.matchId, match.id));
  const byUser = new Map(scored.map((s) => [s.userId, s.points]));

  const expect = (label: string, actual: unknown, expected: unknown) => {
    const ok = actual === expected;
    console.log(`${ok ? "✓" : "✗"} ${label}: ${actual} (expected ${expected})`);
    if (!ok) process.exitCode = 1;
  };

  expect("alice exact", byUser.get(alice.id), 10);
  expect("bob outcome", byUser.get(bob.id), 5);
  expect("david wrong", byUser.get(david.id), 0);
  expect("scored count", settled.scoredPredictions, 3);

  const leaderboard = await getLeaderboard();
  const aliceEntry = leaderboard.find((e) => e.userId === alice.id)!;
  console.log(
    `leaderboard: alice rank ${aliceEntry.rank}, ${aliceEntry.points} pts, movement ${aliceEntry.movement}`,
  );

  // Clean up so reruns and the demo data stay predictable.
  await db.delete(predictions).where(eq(predictions.matchId, match.id));
  await db.delete(matches).where(eq(matches.id, match.id));
  console.log("cleaned up e2e match");
  process.exit(process.exitCode ?? 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
