"use server";

import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  appSettings,
  matches,
  passwordResetRequests,
  predictions,
  users,
} from "@/db/schema";
import { isOpenForPredictions } from "@/lib/competition";
import { runSync, settleResults } from "@/lib/sync";
import { predictionSchema } from "@/lib/validation";

export interface AdminActionState {
  error?: string;
  ok?: boolean;
  /** One-time secrets to show the admin exactly once (e.g. a reset code). */
  secret?: string;
}

async function requireAdmin(): Promise<{ userId: number } | null> {
  const session = await auth();
  if (session?.user.role !== "admin") return null;
  return { userId: session.user.userId };
}

/** Issue a one-time password reset code for a user, shown once to the admin. */
export async function issueResetCode(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await requireAdmin())) return { error: "Admin only" };

  const userId = Number(formData.get("userId"));
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || user.isAi) return { error: "User not found" };

  // Invalidate any previous outstanding codes for this user.
  await db
    .update(passwordResetRequests)
    .set({ status: "expired" })
    .where(
      and(
        eq(passwordResetRequests.userId, userId),
        inArray(passwordResetRequests.status, ["pending", "issued"]),
      ),
    );

  const code = crypto.randomBytes(4).toString("hex"); // 8 chars, e.g. "3f9a07bc"
  await db.insert(passwordResetRequests).values({
    userId,
    codeHash: await bcrypt.hash(code, 10),
    status: "issued",
    expiresAt: new Date(Date.now() + 24 * 3600_000),
  });

  revalidatePath("/admin/users");
  return { ok: true, secret: `${user.username} → ${code}` };
}

/** Enter a prediction on behalf of the AI contestant. Same rules as humans. */
export async function submitAiPrediction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await requireAdmin())) return { error: "Admin only" };

  const parsed = predictionSchema.safeParse({
    matchId: formData.get("matchId"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
  });
  if (!parsed.success) return { error: "Scores must be whole numbers from 0 to 20" };

  const ai = await db.query.users.findFirst({ where: eq(users.isAi, true) });
  if (!ai) return { error: "AI user missing — run the seed script" };

  const match = await db.query.matches.findFirst({
    where: eq(matches.id, parsed.data.matchId),
  });
  if (!match) return { error: "Match not found" };
  if (!isOpenForPredictions(match)) {
    return { error: "Predictions are closed for this match — the AI missed the cutoff" };
  }

  const inserted = await db
    .insert(predictions)
    .values({
      userId: ai.id,
      matchId: match.id,
      homeScore: parsed.data.homeScore,
      awayScore: parsed.data.awayScore,
    })
    .onConflictDoNothing({ target: [predictions.userId, predictions.matchId] })
    .returning({ id: predictions.id });
  if (inserted.length === 0) {
    return { error: "The AI already predicted this match — predictions are final" };
  }

  revalidatePath("/admin/ai");
  return { ok: true };
}

const overrideSchema = z.object({
  matchId: z.coerce.number().int().positive(),
  homeScore90: z.coerce.number().int().min(0).max(20),
  awayScore90: z.coerce.number().int().min(0).max(20),
});

/**
 * Manually set a final 90-minute result. Locks the row so the provider sync
 * can never overwrite an admin correction, then settles scoring.
 */
export async function overrideResult(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await requireAdmin())) return { error: "Admin only" };

  const parsed = overrideSchema.safeParse({
    matchId: formData.get("matchId"),
    homeScore90: formData.get("homeScore90"),
    awayScore90: formData.get("awayScore90"),
  });
  if (!parsed.success) return { error: "Scores must be whole numbers from 0 to 20" };

  const updated = await db
    .update(matches)
    .set({
      homeScore90: parsed.data.homeScore90,
      awayScore90: parsed.data.awayScore90,
      status: "FINISHED",
      resultLocked: true,
    })
    .where(eq(matches.id, parsed.data.matchId))
    .returning({ id: matches.id });
  if (updated.length === 0) return { error: "Match not found" };

  await settleResults("admin result override");
  revalidatePath("/admin/matches");
  revalidatePath("/leaderboard");
  return { ok: true };
}

const manualMatchSchema = z.object({
  stage: z.enum(["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL"]),
  homeTeam: z.string().trim().min(1).max(40),
  awayTeam: z.string().trim().min(1).max(40),
  kickoffLocal: z.string().min(1),
  tzOffsetMinutes: z.coerce.number().int(),
});

/** Fallback fixture entry for when no provider has the match. */
export async function createManualMatch(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await requireAdmin())) return { error: "Admin only" };

  const parsed = manualMatchSchema.safeParse({
    stage: formData.get("stage"),
    homeTeam: formData.get("homeTeam"),
    awayTeam: formData.get("awayTeam"),
    kickoffLocal: formData.get("kickoffLocal"),
    tzOffsetMinutes: formData.get("tzOffsetMinutes"),
  });
  if (!parsed.success) return { error: "All fields are required" };

  // datetime-local has no zone; the browser sends its offset alongside.
  const kickoffUtc = new Date(
    new Date(parsed.data.kickoffLocal).getTime() +
      parsed.data.tzOffsetMinutes * 60_000,
  );
  if (Number.isNaN(kickoffUtc.getTime())) return { error: "Invalid kickoff time" };

  await db.insert(matches).values({
    provider: "manual",
    providerMatchId: `manual-${crypto.randomUUID()}`,
    stage: parsed.data.stage,
    homeTeam: parsed.data.homeTeam,
    awayTeam: parsed.data.awayTeam,
    kickoffUtc,
    status: "TIMED",
  });

  revalidatePath("/admin/matches");
  revalidatePath("/matches");
  return { ok: true };
}

export async function setProvider(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  if (!(await requireAdmin())) return { error: "Admin only" };

  const value = String(formData.get("provider"));
  if (!["football-data", "manual"].includes(value)) return { error: "Unknown provider" };

  await db
    .insert(appSettings)
    .values({ key: "match_provider", value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } });

  revalidatePath("/admin");
  return { ok: true };
}

export async function syncNow(): Promise<AdminActionState> {
  if (!(await requireAdmin())) return { error: "Admin only" };
  try {
    const result = await runSync();
    revalidatePath("/admin");
    return {
      ok: true,
      secret: `fetched ${result.fetched}, created ${result.created}, updated ${result.updated}, scored ${result.scoredPredictions}`,
    };
  } catch (err) {
    console.error("manual sync failed:", err);
    return { error: "Sync failed — check provider status and token" };
  }
}
