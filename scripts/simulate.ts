/**
 * Dev-only: seeds a believable mid-tournament state so leaderboard, TV mode,
 * heatmap and stats pages can be built and demoed before real results exist.
 * Re-runnable: wipes previous simulation data first. Never run in production.
 */
import bcrypt from "bcryptjs";
import { eq, inArray, like } from "drizzle-orm";

import { db } from "../src/db";
import {
  achievements,
  leaderboardSnapshots,
  matches,
  predictions,
  snapshotEntries,
  users,
} from "../src/db/schema";

const SIM_USERS = [
  { username: "sim_alice", displayName: "Alice" },
  { username: "sim_bob", displayName: "Bob" },
  { username: "sim_charlie", displayName: "Charlie" },
  { username: "sim_david", displayName: "David" },
  { username: "sim_erin", displayName: "Erin" },
];

const SIM_MATCHES = [
  // [home, hcode, away, acode, homeScore90, awayScore90, hoursAgo]
  ["Brazil", "BRA", "Denmark", "DEN", 2, 0, 30],
  ["Spain", "ESP", "Nigeria", "NGA", 1, 1, 26],
  ["Germany", "GER", "Japan", "JPN", 0, 2, 22],
] as const;

// prediction grids: per user (incl. AI), per match: [home, away, points]
const PICKS: Record<string, ([number, number, number] | null)[]> = {
  "mq-chat": [
    [2, 0, 10],
    [2, 1, 0],
    [1, 1, 0],
  ],
  sim_alice: [
    [2, 0, 10],
    [1, 1, 10],
    [0, 2, 10],
  ],
  sim_bob: [
    [3, 1, 5],
    [1, 1, 10],
    [1, 1, 0],
  ],
  sim_charlie: [
    [1, 0, 5],
    [0, 0, 5],
    [0, 1, 5],
  ],
  sim_david: [
    [0, 0, 0],
    [2, 1, 0],
    [0, 3, 5],
  ],
  sim_erin: [null, [1, 1, 10], null],
};

async function main() {
  // Wipe previous simulation state (children first).
  const simUsers = await db.select().from(users).where(like(users.username, "sim_%"));
  const simUserIds = simUsers.map((u) => u.id);
  const simMatches = await db.select().from(matches).where(eq(matches.provider, "manual"));
  const simMatchIds = simMatches.map((m) => m.id);

  if (simMatchIds.length > 0)
    await db.delete(predictions).where(inArray(predictions.matchId, simMatchIds));
  if (simUserIds.length > 0) {
    await db.delete(predictions).where(inArray(predictions.userId, simUserIds));
    await db.delete(achievements).where(inArray(achievements.userId, simUserIds));
    await db.delete(snapshotEntries).where(inArray(snapshotEntries.userId, simUserIds));
  }
  await db.delete(snapshotEntries);
  await db.delete(leaderboardSnapshots);
  if (simMatchIds.length > 0)
    await db.delete(matches).where(inArray(matches.id, simMatchIds));
  if (simUserIds.length > 0) await db.delete(users).where(inArray(users.id, simUserIds));

  // Users
  const passwordHash = await bcrypt.hash("simulate123", 10);
  const userIdByName = new Map<string, number>();
  for (const u of SIM_USERS) {
    const [row] = await db
      .insert(users)
      .values({ ...u, passwordHash })
      .returning({ id: users.id });
    userIdByName.set(u.username, row.id);
  }
  const ai = await db.query.users.findFirst({ where: eq(users.isAi, true) });
  if (!ai) throw new Error("AI user missing — run db:seed first");
  userIdByName.set("mq-chat", ai.id);

  // Finished manual matches (treated as LAST_32 for stage stats)
  const matchIds: number[] = [];
  for (const [i, m] of SIM_MATCHES.entries()) {
    const [home, hcode, away, acode, hs, as_, hoursAgo] = m;
    const [row] = await db
      .insert(matches)
      .values({
        provider: "manual",
        providerMatchId: `sim-${i}`,
        stage: "LAST_32",
        homeTeam: home,
        awayTeam: away,
        homeTeamCode: hcode,
        awayTeamCode: acode,
        kickoffUtc: new Date(Date.now() - hoursAgo * 3600_000),
        status: "FINISHED",
        homeScore90: hs,
        awayScore90: as_,
      })
      .returning({ id: matches.id });
    matchIds.push(row.id);
  }

  // Predictions with points (simulating already-scored picks)
  for (const [username, picks] of Object.entries(PICKS)) {
    const userId = userIdByName.get(username)!;
    for (const [i, pick] of picks.entries()) {
      if (!pick) continue;
      await db.insert(predictions).values({
        userId,
        matchId: matchIds[i],
        homeScore: pick[0],
        awayScore: pick[1],
        points: pick[2],
        scoredAt: new Date(),
        createdAt: new Date(Date.now() - 48 * 3600_000),
      });
    }
  }

  // Two snapshots so movement arrows have history. The older one deliberately
  // differs from current standings (Bob led after match 1, Alice was 4th).
  const olderRanks: [string, number, number][] = [
    ["sim_bob", 1, 15],
    ["sim_charlie", 2, 10],
    ["mq-chat", 3, 10],
    ["sim_alice", 4, 10],
    ["sim_david", 5, 0],
    ["sim_erin", 5, 0],
  ];
  const [older] = await db
    .insert(leaderboardSnapshots)
    .values({ reason: "sim: after match 1", takenAt: new Date(Date.now() - 20 * 3600_000) })
    .returning({ id: leaderboardSnapshots.id });
  await db.insert(snapshotEntries).values(
    olderRanks
      .filter(([name]) => userIdByName.has(name))
      .map(([name, rank, points]) => ({
        snapshotId: older.id,
        userId: userIdByName.get(name)!,
        rank,
        points,
      })),
  );

  // Latest snapshot mirrors live standings (what sync would have written).
  const { computeStandings } = await import("../src/lib/scoring");
  const standings = await computeStandings();
  const [latest] = await db
    .insert(leaderboardSnapshots)
    .values({ reason: "sim: after match 3" })
    .returning({ id: leaderboardSnapshots.id });
  await db.insert(snapshotEntries).values(
    standings.map((s) => ({
      snapshotId: latest.id,
      userId: s.userId,
      rank: s.rank,
      points: s.points,
    })),
  );

  // Alice out-scored the AI in the (simulated) stage.
  await db
    .insert(achievements)
    .values({ userId: userIdByName.get("sim_alice")!, type: "ai_slayer", stage: "LAST_32" })
    .onConflictDoNothing();

  console.log("Simulation seeded: 5 users, 3 finished matches, 2 snapshots.");
  console.log("Sim logins: sim_alice / simulate123 (etc.)");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
