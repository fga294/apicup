/**
 * Go-live: take the competition from testing into production in one safe pass.
 *
 * What it does, in order:
 *   1. Removes every test account (`test.user…`) and ALL of its dependent rows
 *      (predictions, snapshot entries, achievements, password-reset requests),
 *      leaving no orphans.
 *   2. Imports/refreshes all cup fixtures through the existing sync pipeline
 *      (`runSync()` — the same code path as `POST /api/sync`).
 *   3. Validates the result and prints a summary.
 *
 * What it deliberately PRESERVES:
 *   - the `admin` account and the `mq-chat` AI contestant;
 *   - every match row (MQ-Chat's head-start points are stored against specific
 *     match ids, so matches are never deleted — sync only adds/updates them);
 *   - all leaderboard snapshots (movement arrows self-correct on the next
 *     finished match).
 *
 * Idempotent and safe to re-run: deletions are no-ops once the test users are
 * gone, sync upserts by (provider, provider_match_id), and scoring only touches
 * predictions whose `points` are still null — so MQ-Chat's already-earned points
 * are never recomputed.
 *
 * NOTE: the Neon HTTP driver exposes no `db.transaction()` (see src/db/index.ts),
 * so — exactly like reset-competition.ts and runSync() — this script relies on
 * idempotency and FK-safe ordering instead of a wrapping transaction.
 *
 * Local:      npm run db:go-live
 * Production: DATABASE_URL=<neon url> FOOTBALL_DATA_TOKEN=<token> \
 *               npx tsx scripts/go-live.ts --yes
 */
import { and, eq, inArray, isNull, like, ne, sql } from "drizzle-orm";

import { db } from "../src/db";
import {
  achievements,
  matches,
  passwordResetRequests,
  predictions,
  snapshotEntries,
  users,
} from "../src/db/schema";
import { runSync } from "../src/lib/sync";

/** Usernames of the throwaway accounts created by scripts/test-users.ts. */
const TEST_USER_PATTERN = "test.user%"; // e.g. test.user1@mq.edu.au … test.userN@…
const AI_USERNAME = "mq-chat";
const ADMIN_USERNAME = "admin";

/** Collected non-fatal warnings, surfaced together in the final summary. */
const warnings: string[] = [];

async function main() {
  // ── 0. Safety guard ──────────────────────────────────────────────────────
  // This permanently deletes accounts. Require an explicit --yes, mirroring
  // reset-competition.ts, so it can never run by accident.
  if (!process.argv.includes("--yes")) {
    console.error(
      "This removes all test users and their data, then imports cup matches.\n" +
        "Re-run with --yes to confirm.",
    );
    process.exit(1);
  }

  console.log("== Go-live: cleanup + match import ==\n");

  // ── 1. Verify the accounts we must protect actually exist ────────────────
  // We never recreate or modify them here. If MQ-Chat is missing, something is
  // wrong (it must not have been wiped), and silently seeding a fresh AI would
  // give it a zero head start — so we abort instead of guessing.
  const ai = await db.query.users.findFirst({
    where: eq(users.username, AI_USERNAME),
  });
  if (!ai) {
    console.error(
      `FATAL: the '${AI_USERNAME}' account is missing. Aborting without changes.\n` +
        "Run `npm run db:seed` only if you intend to create a brand-new AI with no history.",
    );
    process.exit(1);
  }
  const admin = await db.query.users.findFirst({
    where: eq(users.username, ADMIN_USERNAME),
  });
  if (!admin) {
    // Not fatal — the cup can run without the admin row present — but worth flagging.
    warnings.push(
      `Admin account '${ADMIN_USERNAME}' was not found. It will NOT be created here.`,
    );
  }
  console.log(
    `Protected accounts: ${ADMIN_USERNAME}${admin ? "" : " (MISSING)"}, ` +
      `${AI_USERNAME} (id=${ai.id}, isAi=${ai.isAi}).`,
  );

  // ── 2. Identify the test users ───────────────────────────────────────────
  // Match by the well-known prefix and, belt-and-suspenders, exclude any admin
  // or AI row so the protected accounts can never be caught by the pattern.
  const testUsers = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(
      and(
        like(users.username, TEST_USER_PATTERN),
        ne(users.role, "admin"),
        eq(users.isAi, false),
      ),
    );
  const testIds = testUsers.map((u) => u.id);
  console.log(`\nFound ${testIds.length} test account(s) to remove.`);
  if (testUsers.length > 0) {
    console.log(`  ${testUsers.map((u) => u.username).join(", ")}`);
  }

  // ── 3. Delete dependent rows, then the users themselves ──────────────────
  // All FKs are ON DELETE NO ACTION (no cascades), so children must go first,
  // in dependency order. Each step is a no-op when testIds is empty, keeping the
  // whole script idempotent.
  const removed = {
    predictions: 0,
    snapshotEntries: 0,
    achievements: 0,
    passwordResetRequests: 0,
    users: 0,
  };

  if (testIds.length > 0) {
    removed.predictions = (
      await db
        .delete(predictions)
        .where(inArray(predictions.userId, testIds))
        .returning({ id: predictions.id })
    ).length;

    removed.snapshotEntries = (
      await db
        .delete(snapshotEntries)
        .where(inArray(snapshotEntries.userId, testIds))
        .returning({ userId: snapshotEntries.userId })
    ).length;

    removed.achievements = (
      await db
        .delete(achievements)
        .where(inArray(achievements.userId, testIds))
        .returning({ id: achievements.id })
    ).length;

    removed.passwordResetRequests = (
      await db
        .delete(passwordResetRequests)
        .where(inArray(passwordResetRequests.userId, testIds))
        .returning({ id: passwordResetRequests.id })
    ).length;

    // Finally the accounts, now that nothing references them.
    removed.users = (
      await db
        .delete(users)
        .where(inArray(users.id, testIds))
        .returning({ id: users.id })
    ).length;
  }

  console.log("\nRemoved test data:");
  console.log(`  predictions ............ ${removed.predictions}`);
  console.log(`  snapshot_entries ....... ${removed.snapshotEntries}`);
  console.log(`  achievements ........... ${removed.achievements}`);
  console.log(`  password_reset_requests  ${removed.passwordResetRequests}`);
  console.log(`  users .................. ${removed.users}`);

  // ── 4. Import all cup matches ────────────────────────────────────────────
  // Reuse the production sync: it fetches from the active provider, upserts
  // fixtures (creating past + future matches), then scores any finished ones.
  // Running cleanup BEFORE this means scoring only ever touches the surviving
  // (MQ-Chat) predictions.
  console.log("\nImporting cup matches via runSync()…");
  const sync = await runSync();
  console.log(
    `  provider=${sync.provider} fetched=${sync.fetched} created=${sync.created} ` +
      `updated=${sync.updated} skippedLocked=${sync.skippedLocked} ` +
      `scored=${sync.scoredPredictions} aiSlayers=${sync.aiSlayersAwarded}`,
  );
  if (sync.fetched === 0) {
    warnings.push(
      `Sync fetched 0 fixtures (provider='${sync.provider}'). ` +
        "If matches were expected, check FOOTBALL_DATA_TOKEN and the " +
        "app_settings 'match_provider' value (it must not be 'manual').",
    );
  }

  // ── 5. Validation (read-only integrity checks) ───────────────────────────
  let integrityOk = true;

  // 5a. No test accounts must remain.
  const [{ n: testRemaining }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(like(users.username, TEST_USER_PATTERN));
  if (testRemaining !== 0) {
    integrityOk = false;
    console.error(`  ✗ ${testRemaining} test account(s) still present.`);
  }

  // 5b. No orphaned predictions — neither dangling user_id nor dangling match_id.
  const [{ n: orphanByUser }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(predictions)
    .leftJoin(users, eq(users.id, predictions.userId))
    .where(isNull(users.id));
  const [{ n: orphanByMatch }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(predictions)
    .leftJoin(matches, eq(matches.id, predictions.matchId))
    .where(isNull(matches.id));
  if (orphanByUser !== 0 || orphanByMatch !== 0) {
    integrityOk = false;
    console.error(
      `  ✗ Orphaned predictions: ${orphanByUser} without a user, ${orphanByMatch} without a match.`,
    );
  }

  // 5c. MQ-Chat must be intact, with its earned points untouched.
  const [aiStats] = await db
    .select({
      predictionCount: sql<number>`count(*)::int`,
      scoredCount: sql<number>`count(${predictions.points})::int`,
      totalPoints: sql<number>`coalesce(sum(${predictions.points}), 0)::int`,
    })
    .from(predictions)
    .where(eq(predictions.userId, ai.id));

  // 5d. How many real competitors remain (non-admin, non-AI). At go-live this is
  // expected to be 0 — everyone registers fresh from here.
  const [{ n: participantsLeft }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(and(ne(users.role, "admin"), eq(users.isAi, false)));

  // 5e. Match totals (overall, by stage, finished).
  const [{ n: matchTotal }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(matches);
  const [{ n: finishedTotal }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(matches)
    .where(eq(matches.status, "FINISHED"));
  const stageRows = await db
    .select({ stage: matches.stage, n: sql<number>`count(*)::int` })
    .from(matches)
    .groupBy(matches.stage);

  // ── 6. Summary ───────────────────────────────────────────────────────────
  console.log("\n=== Summary ===");
  console.log(
    `Accounts kept: ${ADMIN_USERNAME}${admin ? "" : " (missing)"}, ` +
      `${AI_USERNAME}. Other competitors remaining: ${participantsLeft}.`,
  );
  console.log(
    `MQ-Chat head start: ${aiStats.totalPoints} pts ` +
      `(${aiStats.scoredCount} scored / ${aiStats.predictionCount} predictions).`,
  );
  console.log(`Matches: ${matchTotal} total, ${finishedTotal} finished.`);
  for (const r of stageRows.sort((a, b) => a.stage.localeCompare(b.stage))) {
    console.log(`  ${r.stage} … ${r.n}`);
  }
  console.log(
    `Test data removed: ${removed.users} user(s) + ` +
      `${removed.predictions} prediction(s) + ${removed.snapshotEntries} snapshot ` +
      `entr(ies) + ${removed.achievements} achievement(s) + ` +
      `${removed.passwordResetRequests} reset request(s).`,
  );

  if (warnings.length > 0) {
    console.log("\nWARNINGS:");
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }

  if (!integrityOk) {
    console.error("\nIntegrity checks FAILED — see ✗ lines above.");
    process.exit(1);
  }

  console.log("\nIntegrity checks passed. Go-live complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
