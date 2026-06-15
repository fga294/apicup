/**
 * Admit the full World Cup group stage into the competition.
 *
 * By default the sync pipeline only imports knockout fixtures; group-stage
 * ("warm-up") games are admitted only when their provider match id appears in
 * the `extra_provider_match_ids` app setting (comma-separated — see sync.ts).
 *
 * This script fetches every GROUP_STAGE fixture from the active provider, adds
 * all of their ids to that allowlist (a UNION — ids already there are kept),
 * then runs a normal sync to import whatever is new and refresh the rest.
 *
 * Safe and idempotent:
 *   - Purely additive — it never deletes matches, predictions, or points, so
 *     MQ-Chat's head start and every existing fixture are untouched.
 *   - Re-running adds no new ids and simply re-syncs.
 *   - Scoring only touches predictions on FINISHED matches with null points, so
 *     importing not-yet-played group games awards nothing to anyone.
 *
 * Local:      npm run db:add-group-stage
 * Production: DATABASE_URL=<neon url> FOOTBALL_DATA_TOKEN=<token> \
 *               npx tsx scripts/add-group-stage.ts
 */
import { eq, sql } from "drizzle-orm";

import { db } from "../src/db";
import { appSettings, matches } from "../src/db/schema";
import { getActiveProvider } from "../src/lib/providers";
import { runSync } from "../src/lib/sync";

const ALLOWLIST_KEY = "extra_provider_match_ids";

async function main() {
  // 1. Every group-stage fixture id the active provider knows about.
  const provider = await getActiveProvider();
  const fetched = await provider.fetchMatches();
  const groupIds = fetched
    .filter((m) => m.stage === "GROUP_STAGE")
    .map((m) => m.providerMatchId);
  if (groupIds.length === 0) {
    console.error(
      `Provider '${provider.name}' returned no GROUP_STAGE fixtures — nothing to add. ` +
        "(If provider is 'manual', the feed is empty by design.)",
    );
    process.exit(1);
  }

  // 2. Merge into the existing allowlist, keeping whatever is already admitted.
  const row = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, ALLOWLIST_KEY),
  });
  const ids = new Set(
    (row?.value ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  );
  const before = ids.size;
  for (const id of groupIds) ids.add(id);
  const merged = [...ids].sort((a, b) => Number(a) - Number(b));
  const newlyAdded = merged.length - before;

  await db
    .insert(appSettings)
    .values({ key: ALLOWLIST_KEY, value: merged.join(",") })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: merged.join(",") },
    });

  console.log(
    `Allowlist: ${before} → ${merged.length} id(s) ` +
      `(${newlyAdded} group id(s) added; provider feed has ${groupIds.length} group fixtures).`,
  );

  // 3. Import them — and refresh everything else — through the normal sync.
  const syncResult = await runSync();
  console.log(
    `Sync: provider=${syncResult.provider} fetched=${syncResult.fetched} ` +
      `created=${syncResult.created} updated=${syncResult.updated} ` +
      `skippedLocked=${syncResult.skippedLocked} scored=${syncResult.scoredPredictions}.`,
  );

  // 4. Confirm the result.
  const [{ n: groupInDb }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(matches)
    .where(eq(matches.stage, "GROUP_STAGE"));
  const [{ n: total }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(matches);
  console.log(
    `Now ${groupInDb} group-stage match(es) in the DB (${total} matches total).`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
