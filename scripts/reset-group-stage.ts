/**
 * Reset the warm-up: clear every group-stage prediction/point so the whole
 * field starts the Round of 32 level, while leaving all knockout picks intact.
 *
 * The group stage ("GROUP_STAGE") was a warm-up. This permanently DELETES:
 *   - every prediction (and its inline points) on a GROUP_STAGE match, for ALL
 *     users INCLUDING the MQ-Chat AI. A player's total is SUM(predictions.points)
 *     computed live (computeStandings, src/lib/scoring.ts) — there is no stored
 *     score column — so removing the rows resets scores with no recompute;
 *   - all leaderboard snapshots + snapshot entries (the warm-up movement history);
 *   - all GROUP_STAGE "AI Slayer" achievements.
 * Then it takes one fresh "Round of 32 reset" baseline snapshot, so movement
 * arrows read as "new" until the first R32 scoring rather than jumping off a
 * stale warm-up baseline.
 *
 * What it deliberately PRESERVES (never touched):
 *   - every user account — no username is ever deleted or renamed;
 *   - every match row — group games stay in the DB as warm-up fixtures;
 *   - every prediction/point on LAST_32+ games, including the first R32 game
 *     (Canada x South Africa) and all future knockout picks;
 *   - the extra_provider_match_ids allowlist and all other app settings.
 *
 * Why DELETE rather than null the points: scoreFinishedMatches()
 * (src/lib/scoring.ts) re-awards points to any FINISHED match whose prediction
 * has `points IS NULL`, and it ignores the import allowlist — so zeroing the
 * points would be silently re-scored on the very next sync. Deleting the rows
 * leaves nothing to re-score; group games are long past their kickoff−1h lock,
 * so no new group-stage pick can be created either.
 *
 * DRY RUN BY DEFAULT. With no flag it only reads: it prints exactly what would
 * change and exits without writing. Pass --yes to actually execute.
 *
 * NOTE: the Neon HTTP driver exposes no db.transaction() (see src/db/index.ts),
 * so — like go-live.ts / reset-competition.ts — this relies on FK-safe ordering
 * and idempotency rather than a wrapping transaction. Safe to re-run: once the
 * group-stage rows are gone every delete is a no-op.
 *
 * Local (dry run):  npm run db:reset-group-stage
 * Local (execute):  npm run db:reset-group-stage -- --yes
 * Production:        vercel env pull --environment=production .env.prod
 *                    tsx --env-file=.env.prod scripts/reset-group-stage.ts        # dry run
 *                    tsx --env-file=.env.prod scripts/reset-group-stage.ts --yes  # execute
 *                    rm .env.prod
 */
import { asc, eq, inArray, isNull, ne, sql } from "drizzle-orm";

import { db } from "../src/db";
import {
  achievements,
  leaderboardSnapshots,
  matches,
  predictions,
  snapshotEntries,
  users,
} from "../src/db/schema";
import { computeStandings, takeLeaderboardSnapshot } from "../src/lib/scoring";

const GROUP_STAGE = "GROUP_STAGE" as const;
const SNAPSHOT_REASON = "Round of 32 reset";

/** Collected non-fatal warnings, surfaced together in the final summary. */
const warnings: string[] = [];

/** Best-effort match of the first R32 game purely for human reassurance. */
function isCanadaSouthAfrica(home: string | null, away: string | null): boolean {
  const teams = `${home ?? ""} ${away ?? ""}`.toLowerCase();
  return teams.includes("canada") && teams.includes("south africa");
}

async function main() {
  const execute = process.argv.includes("--yes");
  console.log(
    `== Reset group-stage scores ${execute ? "(EXECUTE)" : "(DRY RUN — no changes will be written)"} ==\n`,
  );

  // ── 1. The group-stage games — the only matches whose predictions we touch ──
  const groupMatches = await db
    .select({ id: matches.id })
    .from(matches)
    .where(eq(matches.stage, GROUP_STAGE));
  const groupIds = groupMatches.map((m) => m.id);
  if (groupIds.length === 0) {
    warnings.push(
      "No GROUP_STAGE matches found in this database. Nothing will be deleted from " +
        "`predictions`. Double-check you are pointed at the right DATABASE_URL.",
    );
  }

  // ── 2. Tally what would be deleted vs. what is preserved (all read-only) ────
  const [delPreds] = groupIds.length
    ? await db
        .select({
          n: sql<number>`count(*)::int`,
          userCount: sql<number>`count(distinct ${predictions.userId})::int`,
        })
        .from(predictions)
        .where(inArray(predictions.matchId, groupIds))
    : [{ n: 0, userCount: 0 }];

  // KEEP side: every prediction NOT on a group-stage match. This count must be
  // identical after execution — it is the strongest proof we touched nothing
  // beyond the warm-up.
  const [keptPreds] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(predictions)
    .innerJoin(matches, eq(matches.id, predictions.matchId))
    .where(ne(matches.stage, GROUP_STAGE));

  const [snapCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(leaderboardSnapshots);
  const [snapEntryCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(snapshotEntries);
  const [groupBadges] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(achievements)
    .where(eq(achievements.stage, GROUP_STAGE));
  const [{ n: userTotal }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users);

  // The Round of 32 fixtures and the picks riding on each — so the operator can
  // eyeball that Canada x South Africa (and every other R32 game) is preserved.
  const last32 = await db
    .select({
      id: matches.id,
      homeTeam: matches.homeTeam,
      awayTeam: matches.awayTeam,
      kickoffUtc: matches.kickoffUtc,
      status: matches.status,
    })
    .from(matches)
    .where(eq(matches.stage, "LAST_32"))
    .orderBy(asc(matches.kickoffUtc), asc(matches.id));
  const last32Counts = last32.length
    ? await db
        .select({ matchId: predictions.matchId, n: sql<number>`count(*)::int` })
        .from(predictions)
        .where(
          inArray(
            predictions.matchId,
            last32.map((m) => m.id),
          ),
        )
        .groupBy(predictions.matchId)
    : [];
  const last32CountById = new Map(last32Counts.map((r) => [r.matchId, r.n]));

  // ── 3. Print the plan ──────────────────────────────────────────────────────
  console.log(`Group-stage matches in this DB: ${groupIds.length}\n`);
  console.log("WILL DELETE:");
  console.log(
    `  predictions on GROUP_STAGE games … ${delPreds.n} ` +
      `(across ${delPreds.userCount} user(s), MQ-Chat included)`,
  );
  console.log(`  leaderboard_snapshots ………………… ${snapCount.n}`);
  console.log(`  snapshot_entries …………………………… ${snapEntryCount.n}`);
  console.log(`  achievements (GROUP_STAGE) ……… ${groupBadges.n}`);
  console.log("  then take 1 fresh baseline snapshot: \"" + SNAPSHOT_REASON + "\"\n");
  console.log("WILL KEEP (untouched):");
  console.log(`  predictions on LAST_32+ games … ${keptPreds.n}`);
  console.log(`  users ……………………………………………… ${userTotal} (none deleted/renamed)`);
  console.log(`  matches ……………………………………………… all (group games stay as warm-up fixtures)`);
  console.log(`  extra_provider_match_ids allowlist … unchanged\n`);

  console.log(`Round of 32 (LAST_32) games — ${last32.length} fixture(s), all preserved:`);
  if (last32.length === 0) {
    warnings.push("No LAST_32 matches found — the Round of 32 may not be imported yet.");
  }
  let foundCanadaSA = false;
  for (const m of last32) {
    const marker = isCanadaSouthAfrica(m.homeTeam, m.awayTeam) ? "  ← Canada x South Africa" : "";
    if (marker) foundCanadaSA = true;
    const when = m.kickoffUtc.toISOString().slice(0, 16).replace("T", " ");
    const picks = last32CountById.get(m.id) ?? 0;
    console.log(
      `  [${when}Z] ${m.homeTeam ?? "TBD"} vs ${m.awayTeam ?? "TBD"} ` +
        `— ${picks} pick(s) [${m.status}]${marker}`,
    );
  }
  if (last32.length > 0 && !foundCanadaSA) {
    warnings.push(
      "Canada x South Africa was not auto-detected by name among LAST_32 games. " +
        "Confirm it appears in the list above (provider naming may differ) before executing.",
    );
  }

  if (!execute) {
    if (warnings.length > 0) {
      console.log("\nWARNINGS:");
      for (const w of warnings) console.log(`  ⚠ ${w}`);
    }
    console.log("\nDRY RUN — nothing was written. Re-run with --yes to execute.");
    process.exit(0);
  }

  // ── 4. Execute, in FK-safe order (children before parents) ─────────────────
  // snapshot_entries → leaderboard_snapshots (FK); achievements + predictions are
  // independent. predictions is a leaf table (nothing references it), so deleting
  // its rows cascades to nothing.
  console.log("\nExecuting…");
  const removed = { snapshotEntries: 0, snapshots: 0, achievements: 0, predictions: 0 };

  removed.snapshotEntries = (
    await db.delete(snapshotEntries).returning({ userId: snapshotEntries.userId })
  ).length;
  removed.snapshots = (
    await db.delete(leaderboardSnapshots).returning({ id: leaderboardSnapshots.id })
  ).length;
  removed.achievements = (
    await db
      .delete(achievements)
      .where(eq(achievements.stage, GROUP_STAGE))
      .returning({ id: achievements.id })
  ).length;
  if (groupIds.length > 0) {
    removed.predictions = (
      await db
        .delete(predictions)
        .where(inArray(predictions.matchId, groupIds))
        .returning({ id: predictions.id })
    ).length;
  }

  // Fresh baseline so the leaderboard's movement is measured from the start of
  // the Round of 32, not from a (now-deleted) warm-up snapshot.
  await takeLeaderboardSnapshot(SNAPSHOT_REASON);

  console.log("Deleted:");
  console.log(`  snapshot_entries …………………… ${removed.snapshotEntries}`);
  console.log(`  leaderboard_snapshots ……… ${removed.snapshots}`);
  console.log(`  achievements (GROUP_STAGE) … ${removed.achievements}`);
  console.log(`  predictions (GROUP_STAGE) …… ${removed.predictions}`);
  console.log(`Took baseline snapshot: "${SNAPSHOT_REASON}".`);

  // ── 5. Validation (read-only integrity checks) ─────────────────────────────
  let integrityOk = true;

  // 5a. No prediction may remain on any GROUP_STAGE match.
  const [{ n: groupPredsLeft }] = groupIds.length
    ? await db
        .select({ n: sql<number>`count(*)::int` })
        .from(predictions)
        .where(inArray(predictions.matchId, groupIds))
    : [{ n: 0 }];
  if (groupPredsLeft !== 0) {
    integrityOk = false;
    console.error(`  ✗ ${groupPredsLeft} group-stage prediction(s) still present.`);
  }

  // 5b. Knockout predictions must be exactly as many as before — proof we never
  // crossed the stage boundary (Canada x South Africa & all R32 picks intact).
  const [keptAfter] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(predictions)
    .innerJoin(matches, eq(matches.id, predictions.matchId))
    .where(ne(matches.stage, GROUP_STAGE));
  if (keptAfter.n !== keptPreds.n) {
    integrityOk = false;
    console.error(
      `  ✗ Knockout predictions changed: ${keptPreds.n} → ${keptAfter.n} (expected no change).`,
    );
  }

  // 5c. No orphaned predictions (no user or match deleted out from under them).
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

  // 5d. Exactly one snapshot — the baseline we just took.
  const [{ n: snapsAfter }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(leaderboardSnapshots);
  if (snapsAfter !== 1) {
    integrityOk = false;
    console.error(`  ✗ Expected exactly 1 snapshot after reset, found ${snapsAfter}.`);
  }

  // 5e. Every user still present — no account was touched.
  const [{ n: userAfter }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users);
  if (userAfter !== userTotal) {
    integrityOk = false;
    console.error(`  ✗ User count changed: ${userTotal} → ${userAfter} (expected no change).`);
  }

  // ── 6. Summary + a peek at the reset standings ─────────────────────────────
  const standings = await computeStandings();
  const userById = new Map((await db.select().from(users)).map((u) => [u.id, u]));
  console.log("\n=== Round of 32 standings (top 5) ===");
  for (const s of standings.slice(0, 5)) {
    const u = userById.get(s.userId);
    console.log(`  #${s.rank}  ${u?.displayName ?? `user ${s.userId}`} — ${s.points} pts`);
  }

  if (warnings.length > 0) {
    console.log("\nWARNINGS:");
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }

  if (!integrityOk) {
    console.error("\nIntegrity checks FAILED — see ✗ lines above. Restore from backup if needed.");
    process.exit(1);
  }

  console.log("\nIntegrity checks passed. Group-stage reset complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
