import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { MatchCard } from "./MatchCard";
import {
  getMatchesWithUserPrediction,
  STAGE_LABELS,
  STAGE_ORDER,
} from "@/lib/queries";
import { syncIfStale } from "@/lib/sync";

export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  await syncIfStale();
  const rows = await getMatchesWithUserPrediction(session.user.userId);

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight">Matches</h1>
      <p className="mt-1 text-sm text-purple-300">
        Predictions lock exactly one hour before kickoff. One prediction per match —
        no edits, no second chances.
      </p>

      {STAGE_ORDER.map((stage) => {
        const stageRows = rows.filter((r) => r.match.stage === stage);
        if (stageRows.length === 0) return null;
        return (
          <section key={stage} className="mt-8">
            <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-amber-300">
              {STAGE_LABELS[stage]}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-purple-300">
                {stageRows.length} matches
              </span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stageRows.map((row) => (
                <MatchCard key={row.match.id} {...row} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
