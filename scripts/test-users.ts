/**
 * Test crowd for warm-up games: ensures 20 test accounts exist
 * (test.user1@mq.edu.au … test.user20@mq.edu.au, password = the email) and
 * submits a random prediction for each on every match that is currently open
 * for predictions. Idempotent — re-run after allowlisting each warm-up game
 * and only missing predictions are added, respecting the real cutoff rules.
 *
 * Local:      npm run db:test-users
 * Production: DATABASE_URL=<neon url> npx tsx scripts/test-users.ts
 */
import bcrypt from "bcryptjs";

import { db } from "../src/db";
import { matches, predictions, users } from "../src/db/schema";
import { isOpenForPredictions } from "../src/lib/competition";

const TEST_USER_COUNT = 20;

/** Realistic-ish goal count: heavy on 0–2, occasional 3–4. */
function randomGoals(): number {
  const r = Math.random();
  if (r < 0.3) return 0;
  if (r < 0.65) return 1;
  if (r < 0.85) return 2;
  if (r < 0.95) return 3;
  return 4;
}

async function main() {
  // 1. Ensure the test accounts exist.
  const testUserIds: number[] = [];
  for (let i = 1; i <= TEST_USER_COUNT; i++) {
    const email = `test.user${i}@mq.edu.au`;
    const inserted = await db
      .insert(users)
      .values({
        username: email,
        displayName: `Test User ${i}`,
        passwordHash: await bcrypt.hash(email, 10),
      })
      .onConflictDoNothing({ target: users.username })
      .returning({ id: users.id });

    if (inserted.length > 0) {
      testUserIds.push(inserted[0].id);
    } else {
      const existing = await db.query.users.findFirst({
        where: (u, { eq }) => eq(u.username, email),
      });
      testUserIds.push(existing!.id);
    }
  }
  console.log(`${TEST_USER_COUNT} test accounts ready (password = their email).`);

  // 2. Random predictions on every open match, same cutoff rules as the UI.
  const allMatches = await db.select().from(matches);
  const openMatches = allMatches.filter((m) => isOpenForPredictions(m));
  if (openMatches.length === 0) {
    console.log("No matches are open for predictions right now — nothing to do.");
    process.exit(0);
  }

  let created = 0;
  for (const match of openMatches) {
    let matchCreated = 0;
    for (const userId of testUserIds) {
      const inserted = await db
        .insert(predictions)
        .values({
          userId,
          matchId: match.id,
          homeScore: randomGoals(),
          awayScore: randomGoals(),
        })
        .onConflictDoNothing({ target: [predictions.userId, predictions.matchId] })
        .returning({ id: predictions.id });
      matchCreated += inserted.length;
    }
    created += matchCreated;
    console.log(
      `${match.homeTeam} v ${match.awayTeam}: ${matchCreated} new prediction(s)`,
    );
  }
  console.log(`Done — ${created} prediction(s) submitted.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
