import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { appSettings, matches } from "@/db/schema";
import { isWithinActiveWindow } from "@/lib/activeWindow";
import { getActiveProvider } from "@/lib/providers";
import {
  awardAiSlayerForCompletedStages,
  scoreFinishedMatches,
  takeLeaderboardSnapshot,
} from "@/lib/scoring";

export interface SyncResult {
  provider: string;
  fetched: number;
  created: number;
  updated: number;
  skippedLocked: number;
  scoredPredictions: number;
  aiSlayersAwarded: number;
}

/** Stages the competition scores. */
const COMPETITION_STAGES: readonly string[] = [
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
];

/**
 * Provider match ids admitted outside the knockout stages — used for
 * warm-up/test fixtures (app_settings key, comma-separated).
 */
async function getExtraMatchIds(): Promise<Set<string>> {
  const row = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, "extra_provider_match_ids"),
  });
  return new Set(
    (row?.value ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/**
 * Pull fixtures/results from the active provider, upsert them, then score
 * whatever newly finished. Every step is idempotent, so overlapping or
 * repeated runs (cron + lazy trigger + admin button) are harmless.
 */
export async function runSync(): Promise<SyncResult> {
  const provider = await getActiveProvider();
  const extraIds = await getExtraMatchIds();
  const fetched = (await provider.fetchMatches()).filter(
    (m) => COMPETITION_STAGES.includes(m.stage) || extraIds.has(m.providerMatchId),
  );

  const existing = await db
    .select()
    .from(matches)
    .where(eq(matches.provider, provider.name));
  const existingByProviderId = new Map(existing.map((m) => [m.providerMatchId, m]));

  let created = 0;
  let updated = 0;
  let skippedLocked = 0;

  for (const incoming of fetched) {
    const current = existingByProviderId.get(incoming.providerMatchId);
    if (!current) {
      await db.insert(matches).values({
        provider: provider.name,
        ...incoming,
        lastSyncedAt: new Date(),
      });
      created++;
      continue;
    }
    if (current.resultLocked) {
      skippedLocked++;
      continue;
    }
    const changed =
      current.status !== incoming.status ||
      current.homeTeam !== incoming.homeTeam ||
      current.awayTeam !== incoming.awayTeam ||
      current.kickoffUtc.getTime() !== incoming.kickoffUtc.getTime() ||
      current.homeScore90 !== incoming.homeScore90 ||
      current.awayScore90 !== incoming.awayScore90;
    if (changed) {
      await db
        .update(matches)
        .set({ ...incoming, lastSyncedAt: new Date() })
        .where(eq(matches.id, current.id));
      updated++;
    }
  }

  const { scoredPredictions, aiSlayersAwarded } = await settleResults("sync");

  await db
    .insert(appSettings)
    .values({ key: "last_sync_at", value: new Date().toISOString() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: sql`excluded.value` },
    });

  return {
    provider: provider.name,
    fetched: fetched.length,
    created,
    updated,
    skippedLocked,
    scoredPredictions,
    aiSlayersAwarded,
  };
}

/**
 * Score any newly finished matches and, if anything changed, snapshot the
 * leaderboard and award AI Slayer badges. Shared by sync and by admin result
 * overrides so both paths settle results identically.
 */
export async function settleResults(
  trigger: string,
): Promise<{ scoredPredictions: number; aiSlayersAwarded: number }> {
  const scoredPredictions = await scoreFinishedMatches();
  let aiSlayersAwarded = 0;
  if (scoredPredictions > 0) {
    await takeLeaderboardSnapshot(`${trigger}: ${scoredPredictions} predictions scored`);
    aiSlayersAwarded = await awardAiSlayerForCompletedStages();
  }
  return { scoredPredictions, aiSlayersAwarded };
}

const STALE_AFTER_MS = 3 * 60 * 1000;

/**
 * Lazy trigger: pages that render live data call this; it syncs only when
 * data is stale. During match windows the office TV's polling keeps results
 * fresh without any cron at all.
 */
export async function syncIfStale(): Promise<void> {
  // Outside the active window there are no games to pull, so skip even the
  // staleness read — that keeps off-hours page loads from waking the database.
  if (!isWithinActiveWindow()) return;
  const row = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, "last_sync_at"),
  });
  const last = row ? Date.parse(row.value) : 0;
  if (Date.now() - last < STALE_AFTER_MS) return;
  try {
    await runSync();
  } catch (err) {
    // A failed background refresh must never take down a page render.
    console.error("syncIfStale failed:", err);
  }
}
