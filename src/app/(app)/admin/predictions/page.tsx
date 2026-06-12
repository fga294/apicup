import { asc, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/db";
import { matches, predictions, users } from "@/db/schema";
import { LocalKickoff } from "@/components/LocalKickoff";
import { STAGE_LABELS } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminPredictionsPage() {
  const session = await auth();
  if (session?.user.role !== "admin") redirect("/");

  const rows = await db
    .select({ prediction: predictions, user: users, match: matches })
    .from(predictions)
    .innerJoin(users, eq(users.id, predictions.userId))
    .innerJoin(matches, eq(matches.id, predictions.matchId))
    .orderBy(desc(matches.kickoffUtc), asc(users.displayName));

  const byMatch = new Map<number, typeof rows>();
  for (const row of rows) {
    byMatch.set(row.match.id, [...(byMatch.get(row.match.id) ?? []), row]);
  }

  return (
    <div>
      <h1 className="font-display text-4xl uppercase tracking-wide">
        All <span className="text-gold-400">predictions</span>
      </h1>
      <p className="mt-1 text-sm text-chalk-dim">
        Every submitted pick, grouped by match — {rows.length} prediction
        {rows.length === 1 ? "" : "s"} in total. Predictions are immutable; this
        view is read-only by design.
      </p>

      {byMatch.size === 0 && (
        <p className="mt-8 rounded-2xl border border-chalk/10 bg-pitch-900/70 p-6 text-sm text-chalk-dim">
          No predictions submitted yet.
        </p>
      )}

      {[...byMatch.values()].map((matchRows) => {
        const m = matchRows[0].match;
        const finished = m.status === "FINISHED" && m.homeScore90 !== null;
        return (
          <section key={m.id} className="mt-8">
            <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-display text-2xl uppercase tracking-wide">
              {m.homeTeam ?? "TBD"} <span className="text-chalk-dim">v</span>{" "}
              {m.awayTeam ?? "TBD"}
              {finished && (
                <span className="font-mono text-lg text-gold-300">
                  FT {m.homeScore90}–{m.awayScore90}
                </span>
              )}
              <span className="font-sans text-xs font-normal text-chalk-dim">
                {STAGE_LABELS[m.stage]} ·{" "}
                <LocalKickoff kickoffIso={m.kickoffUtc.toISOString()} /> ·{" "}
                {matchRows.length} pick{matchRows.length === 1 ? "" : "s"}
              </span>
            </h2>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-chalk/10">
              <table className="w-full min-w-130 text-left text-sm">
                <thead className="bg-pitch-900/90 font-mono text-[11px] uppercase tracking-widest text-chalk-dim">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Participant</th>
                    <th className="px-4 py-2.5 font-semibold">Email</th>
                    <th className="px-4 py-2.5 text-center font-semibold">Pick</th>
                    <th className="px-4 py-2.5 text-center font-semibold">Points</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {matchRows.map(({ prediction, user }) => (
                    <tr
                      key={prediction.id}
                      className="border-t border-chalk/8 bg-pitch-900/50"
                    >
                      <td className="px-4 py-2 font-semibold">
                        {user.displayName}
                        {user.isAi && (
                          <span className="ml-2 rounded border border-skyx-400/40 px-1.5 py-px font-mono text-[10px] font-bold text-skyx-300">
                            AI
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-chalk-dim">
                        {user.username}
                      </td>
                      <td className="px-4 py-2 text-center font-mono font-bold tabular-nums">
                        {prediction.homeScore}–{prediction.awayScore}
                      </td>
                      <td className="px-4 py-2 text-center">
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
                          <span className="font-mono text-xs text-chalk-dim">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs text-chalk-dim">
                        <LocalKickoff kickoffIso={prediction.createdAt.toISOString()} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
