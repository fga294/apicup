"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/db";
import { matches, predictions } from "@/db/schema";
import { isOpenForPredictions } from "@/lib/competition";
import { predictionSchema } from "@/lib/validation";

export interface PredictState {
  error?: string;
  ok?: boolean;
}

export async function submitPrediction(
  _prev: PredictState,
  formData: FormData,
): Promise<PredictState> {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in" };

  const parsed = predictionSchema.safeParse({
    matchId: formData.get("matchId"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
  });
  if (!parsed.success) return { error: "Scores must be whole numbers from 0 to 20" };

  const match = await db.query.matches.findFirst({
    where: eq(matches.id, parsed.data.matchId),
  });
  if (!match) return { error: "Match not found" };

  // Server clock is the only authority on the cutoff.
  if (!isOpenForPredictions(match)) {
    return { error: "Predictions are closed for this match" };
  }

  const inserted = await db
    .insert(predictions)
    .values({
      userId: session.user.userId,
      matchId: match.id,
      homeScore: parsed.data.homeScore,
      awayScore: parsed.data.awayScore,
    })
    .onConflictDoNothing({ target: [predictions.userId, predictions.matchId] })
    .returning({ id: predictions.id });

  if (inserted.length === 0) {
    return { error: "You already predicted this match — predictions are final" };
  }

  revalidatePath("/matches");
  revalidatePath("/");
  return { ok: true };
}
