/**
 * Enter MQ-Chat's Round-of-32 predictions in one pass, applying the exact same
 * rules as the admin UI (`submitAiPrediction` → `isOpenForPredictions`): a pick
 * is inserted only when both teams are known, the match is SCHEDULED/TIMED, and
 * the kickoff−1h cutoff has not passed. Inserts use onConflictDoNothing on
 * (user_id, match_id), so a pick already present is never overwritten.
 *
 * The scorelines below are MQ-Chat's (Opus 4.8) analysis, weighted on this
 * tournament's actual group-stage form, team pedigree, and knockout scoreline
 * patterns. Each pick carries the expected home/away team names; if a match id
 * no longer maps to that fixture the pick is SKIPPED (never mis-recorded).
 *
 * DRY RUN BY DEFAULT — prints the plan and writes nothing. Pass --yes to insert.
 *
 * Local (dry run):  npm run db:ai-r32-picks
 * Local (execute):  npm run db:ai-r32-picks -- --yes
 * Production:        vercel env pull --environment=production .env.prod
 *                    tsx --env-file=.env.prod scripts/ai-r32-picks.ts        # dry run
 *                    tsx --env-file=.env.prod scripts/ai-r32-picks.ts --yes  # execute
 *                    rm .env.prod
 */
import { and, eq } from "drizzle-orm";

import { db } from "../src/db";
import { matches, predictions, users } from "../src/db/schema";
import { isOpenForPredictions } from "../src/lib/competition";

interface Pick {
  matchId: number;
  home: string;
  away: string;
  hs: number;
  as: number;
}

// Score is home–away. Verified against prod fixtures (ids 2–16) on 2026-06-29.
const PICKS: Pick[] = [
  { matchId: 2, home: "Brazil", away: "Japan", hs: 2, as: 1 },
  { matchId: 3, home: "Germany", away: "Paraguay", hs: 2, as: 0 },
  { matchId: 4, home: "Netherlands", away: "Morocco", hs: 2, as: 1 },
  { matchId: 5, home: "Ivory Coast", away: "Norway", hs: 1, as: 2 },
  { matchId: 6, home: "France", away: "Sweden", hs: 2, as: 0 },
  { matchId: 7, home: "Mexico", away: "Ecuador", hs: 1, as: 0 },
  { matchId: 8, home: "England", away: "Congo DR", hs: 2, as: 0 },
  { matchId: 9, home: "Belgium", away: "Senegal", hs: 2, as: 1 },
  { matchId: 10, home: "USA", away: "Bosnia-H.", hs: 2, as: 1 },
  { matchId: 11, home: "Spain", away: "Austria", hs: 2, as: 0 },
  { matchId: 12, home: "Portugal", away: "Croatia", hs: 2, as: 1 },
  { matchId: 13, home: "Switzerland", away: "Algeria", hs: 2, as: 1 },
  { matchId: 14, home: "Australia", away: "Egypt", hs: 0, as: 1 },
  { matchId: 15, home: "Argentina", away: "Cape Verde", hs: 3, as: 0 },
  { matchId: 16, home: "Colombia", away: "Ghana", hs: 2, as: 0 },
];

async function main() {
  const execute = process.argv.includes("--yes");
  const now = new Date();
  console.log(
    `== Enter MQ-Chat R32 picks ${execute ? "(EXECUTE)" : "(DRY RUN — no changes)"} ==\n` +
      `Server now (UTC): ${now.toISOString()}\n`,
  );

  const ai = await db.query.users.findFirst({ where: eq(users.isAi, true) });
  if (!ai) {
    console.error("FATAL: AI contestant (is_ai=true) not found. Run db:seed first.");
    process.exit(1);
  }
  console.log(`AI contestant: ${ai.displayName} (id=${ai.id})\n`);

  const eligible: Pick[] = [];
  for (const p of PICKS) {
    if (p.hs < 0 || p.hs > 20 || p.as < 0 || p.as > 20) {
      console.log(`  SKIP id=${p.matchId} ${p.home} vs ${p.away} — score out of range`);
      continue;
    }
    const match = await db.query.matches.findFirst({ where: eq(matches.id, p.matchId) });
    if (!match) {
      console.log(`  SKIP id=${p.matchId} — match not found`);
      continue;
    }
    // Defend against id drift: the fixture must still be the one we analysed.
    if (match.homeTeam !== p.home || match.awayTeam !== p.away) {
      console.log(
        `  SKIP id=${p.matchId} — fixture mismatch: expected ${p.home} vs ${p.away}, ` +
          `found ${match.homeTeam} vs ${match.awayTeam}`,
      );
      continue;
    }
    const already = await db.query.predictions.findFirst({
      where: and(eq(predictions.userId, ai.id), eq(predictions.matchId, p.matchId)),
    });
    if (already) {
      console.log(
        `  SKIP id=${p.matchId} ${p.home} vs ${p.away} — AI already picked ` +
          `${already.homeScore}-${already.awayScore} (final)`,
      );
      continue;
    }
    if (!isOpenForPredictions(match, now)) {
      console.log(
        `  SKIP id=${p.matchId} ${p.home} vs ${p.away} — closed ` +
          `(status=${match.status}, kickoff ${match.kickoffUtc.toISOString().slice(0, 16)}Z)`,
      );
      continue;
    }
    eligible.push(p);
    console.log(`  WILL INSERT id=${p.matchId} ${p.home} ${p.hs}-${p.as} ${p.away}`);
  }

  console.log(`\n${eligible.length} of ${PICKS.length} pick(s) eligible to insert.`);

  if (!execute) {
    console.log("\nDRY RUN — nothing was written. Re-run with --yes to insert.");
    process.exit(0);
  }

  // ── Insert (idempotent) ────────────────────────────────────────────────────
  let inserted = 0;
  for (const p of eligible) {
    const rows = await db
      .insert(predictions)
      .values({ userId: ai.id, matchId: p.matchId, homeScore: p.hs, awayScore: p.as })
      .onConflictDoNothing({ target: [predictions.userId, predictions.matchId] })
      .returning({ id: predictions.id });
    if (rows.length > 0) inserted++;
  }
  console.log(`\nInserted ${inserted} new pick(s).`);

  // ── Verify: list MQ-Chat's R32 predictions ─────────────────────────────────
  const aiR32 = await db
    .select({
      matchId: predictions.matchId,
      home: matches.homeTeam,
      away: matches.awayTeam,
      hs: predictions.homeScore,
      as: predictions.awayScore,
      status: matches.status,
    })
    .from(predictions)
    .innerJoin(matches, eq(matches.id, predictions.matchId))
    .where(and(eq(predictions.userId, ai.id), eq(matches.stage, "LAST_32")));
  console.log(`\nMQ-Chat now has ${aiR32.length} LAST_32 prediction(s):`);
  for (const r of aiR32.sort((a, b) => a.matchId - b.matchId)) {
    console.log(`  id=${r.matchId} ${r.home} ${r.hs}-${r.as} ${r.away} [${r.status}]`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
