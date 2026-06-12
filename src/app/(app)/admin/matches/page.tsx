import { asc } from "drizzle-orm";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { LocalKickoff } from "@/components/LocalKickoff";
import { STAGE_LABELS } from "@/lib/queries";

import { ManualMatchForm, OverrideResultForm } from "../AdminForms";

export const dynamic = "force-dynamic";

export default async function AdminMatchesPage() {
  const session = await auth();
  if (session?.user.role !== "admin") redirect("/");

  const allMatches = await db.select().from(matches).orderBy(asc(matches.kickoffUtc));

  return (
    <div>
      <h1 className="font-display text-4xl uppercase tracking-wide">
        Matches <span className="text-gold-400">& results</span>
      </h1>
      <p className="mt-1 text-sm text-chalk-dim">
        Fallback controls. Overriding a result marks it FINISHED, locks it against
        provider sync, and recalculates scores, snapshots and achievements.
      </p>

      <section className="mt-6 rounded-2xl border border-chalk/10 bg-pitch-900/70 p-5">
        <h2 className="font-display text-xl uppercase tracking-wide text-gold-300">
          Add manual fixture
        </h2>
        <div className="mt-3">
          <ManualMatchForm />
        </div>
      </section>

      <ul className="mt-6 space-y-2">
        {allMatches.map((m) => (
          <li
            key={m.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-chalk/8 bg-pitch-900/70 px-4 py-3"
          >
            <span className="font-mono text-xs text-chalk-dim">
              {STAGE_LABELS[m.stage]}
            </span>
            <div className="min-w-0">
              <p className="font-semibold">
                {m.homeTeam ?? "TBD"} v {m.awayTeam ?? "TBD"}
                {m.homeScore90 !== null && (
                  <span className="ml-2 font-mono tabular-nums text-gold-300">
                    {m.homeScore90}–{m.awayScore90}
                  </span>
                )}
              </p>
              <p className="font-mono text-xs text-chalk-dim">
                <LocalKickoff kickoffIso={m.kickoffUtc.toISOString()} /> · {m.status}
                {m.resultLocked && " · 🔒 admin-locked"} · {m.provider}
              </p>
            </div>
            <div className="ml-auto">
              {m.status !== "FINISHED" && m.homeTeam && m.awayTeam ? (
                <OverrideResultForm matchId={m.id} />
              ) : m.status === "FINISHED" && !m.resultLocked ? (
                <OverrideResultForm matchId={m.id} />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
