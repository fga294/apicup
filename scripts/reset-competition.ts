/**
 * Fresh start before the real competition: wipes all predictions, matches,
 * snapshots, achievements, reset requests, and participant accounts.
 * KEEPS: admin accounts, the AI contestant, and app settings (the
 * extra_provider_match_ids allowlist is cleared so test fixtures stay gone).
 *
 * Local:      npm run db:reset
 * Production: DATABASE_URL=<neon url> npx tsx scripts/reset-competition.ts --yes
 */
import { and, eq, ne, sql } from "drizzle-orm";

import { db } from "../src/db";
import {
  achievements,
  appSettings,
  leaderboardSnapshots,
  matches,
  passwordResetRequests,
  predictions,
  snapshotEntries,
  users,
} from "../src/db/schema";

async function main() {
  if (!process.argv.includes("--yes")) {
    console.error("This wipes all competition data. Re-run with --yes to confirm.");
    process.exit(1);
  }

  await db.delete(predictions);
  await db.delete(snapshotEntries);
  await db.delete(leaderboardSnapshots);
  await db.delete(achievements);
  await db.delete(passwordResetRequests);
  await db.delete(matches);
  await db
    .delete(users)
    .where(and(ne(users.role, "admin"), eq(users.isAi, false)));
  await db
    .delete(appSettings)
    .where(eq(appSettings.key, "extra_provider_match_ids"));

  const [remaining] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users);
  console.log(
    `Competition reset complete. ${remaining.n} account(s) kept (admins + AI).`,
  );
  console.log("Run a sync to repopulate knockout fixtures.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
