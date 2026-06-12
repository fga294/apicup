import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/db";
import { achievements, matches, predictions } from "@/db/schema";
import { LocalKickoff } from "@/components/LocalKickoff";
import { getLeaderboard } from "@/lib/leaderboard";
import { STAGE_LABELS } from "@/lib/queries";

import { PasswordForm } from "./PasswordForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.userId;

  const [leaderboard, badges, history] = await Promise.all([
    getLeaderboard(),
    db.select().from(achievements).where(eq(achievements.userId, userId)),
    db
      .select({ prediction: predictions, match: matches })
      .from(predictions)
      .innerJoin(matches, eq(matches.id, predictions.matchId))
      .where(eq(predictions.userId, userId))
      .orderBy(desc(matches.kickoffUtc)),
  ]);

  const me = leaderboard.find((e) => e.userId === userId);
  const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

  return (
    <div>
      <h1 className="font-display text-4xl uppercase tracking-wide">
        {session.user.name}
        {me?.isGoldenPredictor && <span title="Golden Predictor"> ⭐</span>}
      </h1>
      <p className="mt-1 font-mono text-sm text-chalk-dim">
        Rank #{me?.rank ?? "—"} · {me?.points ?? 0} points
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-chalk/10 bg-pitch-900/70 p-4 text-center">
          <p className="font-display text-3xl tabular-nums text-gold-300">{me?.points ?? 0}</p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-chalk-dim">Points</p>
        </div>
        <div className="rounded-2xl border border-chalk/10 bg-pitch-900/70 p-4 text-center">
          <p className="font-display text-3xl tabular-nums">{me?.predictionsMade ?? 0}</p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-chalk-dim">Predictions</p>
        </div>
        <div className="rounded-2xl border border-chalk/10 bg-pitch-900/70 p-4 text-center">
          <p className="font-display text-3xl tabular-nums text-limey-300">{me?.exactCount ?? 0}</p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-chalk-dim">Exact hits</p>
        </div>
        <div className="rounded-2xl border border-chalk/10 bg-pitch-900/70 p-4 text-center">
          <p className="font-display text-3xl tabular-nums">{pct(me?.exactRate ?? null)}</p>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-chalk-dim">Exact rate</p>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-2xl uppercase tracking-wide text-gold-300">
          Achievements
        </h2>
        {badges.length === 0 && !me?.isGoldenPredictor ? (
          <p className="mt-3 text-sm text-chalk-dim">
            None yet. Beat the AI in a completed stage to earn 🤖 AI Slayer.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-3">
            {me?.isGoldenPredictor && (
              <span className="rounded-xl border border-gold-400/50 bg-gold-400/10 px-4 py-2 font-semibold text-gold-300">
                ⭐ Golden Predictor — best exact-score rate
              </span>
            )}
            {badges.map((b) => (
              <span
                key={b.id}
                className="rounded-xl border border-coral-400/40 bg-coral-400/10 px-4 py-2 font-semibold text-coral-300"
              >
                🤖 AI Slayer — {STAGE_LABELS[b.stage]}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl uppercase tracking-wide text-gold-300">
          Prediction history
        </h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-chalk-dim">No predictions yet — get picking!</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {history.map(({ prediction, match }) => {
              const finished = match.status === "FINISHED" && match.homeScore90 !== null;
              return (
                <li
                  key={prediction.id}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-chalk/8 bg-pitch-900/70 px-4 py-2 text-sm"
                >
                  <span className="font-mono text-xs text-chalk-dim">
                    <LocalKickoff kickoffIso={match.kickoffUtc.toISOString()} />
                  </span>
                  <span className="font-semibold">
                    {match.homeTeam ?? "TBD"} v {match.awayTeam ?? "TBD"}
                  </span>
                  <span className="ml-auto font-mono tabular-nums">
                    you: <b>{prediction.homeScore}–{prediction.awayScore}</b>
                    {finished && (
                      <span className="text-chalk-dim">
                        {" "}· FT {match.homeScore90}–{match.awayScore90}
                      </span>
                    )}
                  </span>
                  {prediction.points !== null ? (
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-xs font-black ${
                        prediction.points === 10
                          ? "bg-gold-400/20 text-gold-300"
                          : prediction.points === 5
                            ? "bg-limey-400/20 text-limey-300"
                            : "bg-chalk/10 text-chalk-dim"
                      }`}
                    >
                      +{prediction.points}
                    </span>
                  ) : (
                    <span className="rounded-full bg-chalk/10 px-2 py-0.5 font-mono text-xs text-chalk-dim">
                      pending
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl uppercase tracking-wide text-gold-300">
          Change password
        </h2>
        <div className="mt-3">
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}
