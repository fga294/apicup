import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { appSettings, matches } from "@/db/schema";
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

/**
 * Pull fixtures/results from the active provider, upsert them, then score
 * whatever newly finished. Every step is idempotent, so overlapping or
 * repeated runs (cron + lazy trigger + admin button) are harmless.
 */
export async function runSync(): Promise<SyncResult> {
  const provider = await getActiveProvider();
  const fetched = await provider.fetchMatches();

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

  const scoredPredictions = await scoreFinishedMatches();
  let aiSlayersAwarded = 0;
  if (scoredPredictions > 0) {
    await takeLeaderboardSnapshot(`sync: ${scoredPredictions} predictions scored`);
    aiSlayersAwarded = await awardAiSlayerForCompletedStages();
  }

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

const STALE_AFTER_MS = 3 * 60 * 1000;

/**
 * Lazy trigger: pages that render live data call this; it syncs only when
 * data is stale. During match windows the office TV's polling keeps results
 * fresh without any cron at all.
 */
export async function syncIfStale(): Promise<void> {
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
