import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/db";
import { matches, predictions, users } from "@/db/schema";
import { Countdown } from "@/components/Countdown";
import { isOpenForPredictions, predictionCutoff } from "@/lib/competition";
import { STAGE_LABELS } from "@/lib/queries";

import { AiPredictionForm } from "../AdminForms";

export const dynamic = "force-dynamic";

export default async function AdminAiPage() {
  const session = await auth();
  if (session?.user.role !== "admin") redirect("/");

  const ai = await db.query.users.findFirst({ where: eq(users.isAi, true) });
  const allMatches = await db.select().from(matches).orderBy(asc(matches.kickoffUtc));
  const aiPicks = ai
    ? await db.select().from(predictions).where(eq(predictions.userId, ai.id))
    : [];
  const pickByMatch = new Map(aiPicks.map((p) => [p.matchId, p]));

  const open = allMatches.filter((m) => isOpenForPredictions(m) && !pickByMatch.has(m.id));
  const locked = allMatches.filter((m) => pickByMatch.has(m.id));

  return (
    <div>
      <h1 className="font-display text-4xl uppercase tracking-wide">
        AI <span className="text-gold-400">predictions</span>
      </h1>
      <p className="mt-1 text-sm text-chalk-dim">
        Enter MQ-Chat (Opus 4.8)&apos;s externally generated picks. Same rules as
        humans: in before the cutoff, locked forever once submitted.
      </p>

      <section className="mt-6">
        <h2 className="font-display text-2xl uppercase tracking-wide text-gold-300">
          Awaiting AI pick
        </h2>
        {open.length === 0 ? (
          <p className="mt-3 text-sm text-chalk-dim">
            Nothing open — either all picks are in or no prediction windows are open.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {open.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-chalk/8 bg-pitch-900/70 px-4 py-3"
              >
                <span className="font-mono text-xs text-chalk-dim">
                  {STAGE_LABELS[m.stage]}
                </span>
                <span className="font-semibold">
                  {m.homeTeam} v {m.awayTeam}
                </span>
                <span className="font-mono text-xs">
                  <Countdown cutoffIso={predictionCutoff(m.kickoffUtc).toISOString()} />
                </span>
                <div className="ml-auto">
                  <AiPredictionForm matchId={m.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl uppercase tracking-wide text-gold-300">
          Locked AI picks
        </h2>
        {locked.length === 0 ? (
          <p className="mt-3 text-sm text-chalk-dim">None yet.</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {locked.map((m) => {
              const p = pickByMatch.get(m.id)!;
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg border border-chalk/8 bg-pitch-900/70 px-4 py-2 text-sm"
                >
                  <span className="font-mono text-xs text-chalk-dim">
                    {STAGE_LABELS[m.stage]}
                  </span>
                  <span>
                    {m.homeTeam} v {m.awayTeam}
                  </span>
                  <span className="ml-auto font-mono font-bold tabular-nums">
                    {p.homeScore}–{p.awayScore}
                  </span>
                  {p.points !== null && (
                    <span className="rounded-full bg-chalk/10 px-2 py-0.5 font-mono text-xs">
                      +{p.points}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
